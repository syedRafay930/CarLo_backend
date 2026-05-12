import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatStateAnnotation } from './chat-state';
import { createIntentClassifierNode } from './nodes/intent-classifier.node';
import {
  createToolExecutorNode,
  type ToolExecutorDeps,
} from './nodes/tool-executor.node';
import { createResponseGeneratorNode } from './nodes/response-generator.node';

export type { ToolExecutorDeps } from './nodes/tool-executor.node';

export interface BuildChatbotGraphOptions extends ToolExecutorDeps {
  openAIApiKey: string;
}

function routeAfterIntent(state: typeof ChatStateAnnotation.State) {
  const pending = state.missingFields ?? [];
  if (state.intent === 'BOOK_VEHICLE' && pending.length > 0) {
    return 'response_generator';
  }
  return 'tool_executor';
}

export function buildChatbotGraph(options: BuildChatbotGraphOptions) {
  const { openAIApiKey, ...toolAndFaqDeps } = options;

  const intentModel = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    apiKey: openAIApiKey,
  });
  const responseModel = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    apiKey: openAIApiKey,
  });

  const intent_classifier = createIntentClassifierNode(intentModel);
  const tool_executor = createToolExecutorNode(toolAndFaqDeps);
  const response_generator = createResponseGeneratorNode(
    responseModel,
    toolAndFaqDeps.faqContent,
  );

  return new StateGraph(ChatStateAnnotation)
    .addNode('intent_classifier', intent_classifier)
    .addNode('tool_executor', tool_executor)
    .addNode('response_generator', response_generator)
    .addEdge(START, 'intent_classifier')
    .addConditionalEdges('intent_classifier', routeAfterIntent, {
      tool_executor: 'tool_executor',
      response_generator: 'response_generator',
    })
    .addEdge('tool_executor', 'response_generator')
    .addEdge('response_generator', END)
    .compile();
}
