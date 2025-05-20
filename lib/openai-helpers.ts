import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Ensures that the OpenAI assistant exists, creating it if necessary
 * @returns The assistant ID
 */
export async function ensureAssistant(): Promise<string> {
  // First check if we already have an assistant ID
  const existingAssistantId = process.env.OPENAI_ASSISTANT_ID;

  if (existingAssistantId && existingAssistantId !== "asst_YourAssistantID") {
    try {
      // Check if the assistant exists
      const assistant = await openai.beta.assistants.retrieve(
        existingAssistantId
      );
      return assistant.id;
    } catch (error) {
      console.warn("Could not find existing assistant, will create a new one");
    }
  }

  // Create a new assistant
  console.log("Creating new OpenAI assistant for Videa...");

  const assistant = await openai.beta.assistants.create({
    name: "Videa Video Idea Generator",
    description:
      "An assistant that generates viral video ideas based on YouTube trends and user preferences",
    model: "gpt-4-turbo-preview",
    instructions: `You are an AI assistant for Videa, an application that helps content creators generate viral video ideas based on trending topics and data analysis. 

Your role is to create original, engaging video concepts that have viral potential. You should:
1. Analyze trending topics and data
2. Generate creative ideas that leverage current trends
3. Provide specific, actionable video concepts 
4. Format your responses as clean JSON only
5. Always respond with a well-structured idea that includes title, concept, hashtags, and other required fields
6. Never include text outside the JSON response

When improving ideas, focus on the user's specific feedback while maintaining the strengths of the original concept.`,
  });

  console.log(`Created assistant: ${assistant.id}`);

  // In a production app, you would save this to a database or update environment variables
  // For this demo, we'll just return it
  return assistant.id;
}

/**
 * Create a thread and run the assistant to generate a response
 * @param prompt The prompt to send to the assistant
 * @param assistantId The ID of the assistant to use
 * @returns The assistant's response text
 */
export async function runAssistantWithPrompt(
  prompt: string,
  assistantId: string
): Promise<string> {
  try {
    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Add the prompt as a message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    const startTime = Date.now();
    const timeoutMs = 60000; // 1 minute timeout

    while (
      runStatus.status !== "completed" &&
      runStatus.status !== "failed" &&
      runStatus.status !== "cancelled"
    ) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error("Timeout waiting for response");
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== "completed") {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    // Get the messages
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Find the assistant's response
    const assistantMessages = messages.data.filter(
      (m) => m.role === "assistant"
    );
    if (assistantMessages.length === 0) {
      throw new Error("No response from assistant");
    }

    // Get the latest message
    const latestMessage = assistantMessages[0];

    // Extract the text content
    let responseText = "";
    if (latestMessage.content && latestMessage.content.length > 0) {
      const textContent = latestMessage.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        responseText = textContent.text.value;
      }
    }

    if (!responseText) {
      throw new Error("Empty response from assistant");
    }

    return responseText;
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
}
