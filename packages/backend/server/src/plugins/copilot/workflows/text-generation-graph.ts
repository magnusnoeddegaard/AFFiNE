import { AgentFactory } from '../agents/agent-factory';
import { ContextService } from '../context/context-service';
import { GraphDefinition } from '../graph/graph-definition';
import { GraphExecutor } from '../graph/graph-executor';
import { DefaultNodeFactory } from '../graph/node-factory';
import { StateManager } from '../state/state-manager';
import { AgentCapability, GraphState, NodeType } from '../types';

/**
 * Standard workflow for text generation with context augmentation
 *
 * This graph implements a workflow for text generation that:
 * 1. Retrieves relevant context based on the user query
 * 2. Processes the query with an LLM using the retrieved context
 * 3. Conditionally routes to a follow-up processing node if needed
 */
export class TextGenerationGraph {
  private readonly graphDefinition: GraphDefinition;
  private readonly stateManager: StateManager;
  private readonly nodeFactory: DefaultNodeFactory;
  private readonly contextService: ContextService;

  constructor(
    private readonly agentFactory: AgentFactory,
    stateManager: StateManager,
    nodeFactory: DefaultNodeFactory,
    contextService: ContextService
  ) {
    this.stateManager = stateManager;
    this.nodeFactory = nodeFactory;
    this.contextService = contextService;
    this.graphDefinition = this.createGraphDefinition();
  }

  /**
   * Create the graph definition for text generation
   */
  private createGraphDefinition(): GraphDefinition {
    return {
      name: 'text_generation_with_context',
      nodes: {
        // Starting node - prepare the query and state
        prepare: {
          type: NodeType.Tool,
          config: {
            name: 'prepare_query',
            execute: async (state: GraphState) => {
              // Initialize state if needed
              return {
                ...state,
                contextAdded: false,
              };
            },
          },
        },

        // Context retrieval node - fetch relevant context for the query
        retrieve_context: {
          type: NodeType.Tool,
          config: {
            name: 'context_retrieval',
            execute: async (state: GraphState) => {
              // Get the latest user message
              const latestUserMessage = [...state.messages]
                .reverse()
                .find(msg => msg.role === 'user');

              if (!latestUserMessage) {
                return state;
              }

              // Use the context service to search for relevant context
              const searchResults = await this.contextService.searchContext(
                state,
                latestUserMessage.content,
                { limit: 5, threshold: 0.7 }
              );

              // If we have relevant context, add a system message with it
              if (searchResults.length > 0) {
                // Compile relevant context into a single system message
                const contextText = searchResults
                  .map(
                    result =>
                      `--- ${result.metadata?.title || 'Context'} ---\n${result.content}`
                  )
                  .join('\n\n');

                // Insert a system message with context before the user message
                const messagesWithContext = [...state.messages];
                const userMessageIndex =
                  messagesWithContext.indexOf(latestUserMessage);

                messagesWithContext.splice(userMessageIndex, 0, {
                  role: 'system',
                  content: `Here is relevant information that may help with the user's query:\n\n${contextText}\n\nUse this information to inform your response, but focus on directly answering the user's question.`,
                });

                return {
                  ...state,
                  messages: messagesWithContext,
                  contextAdded: true,
                  contextSearchResults: searchResults,
                };
              }

              return {
                ...state,
                contextAdded: false,
                contextSearchResults: [],
              };
            },
          },
        },

        // Text generation node - invoke the LLM agent
        generate_text: {
          type: NodeType.Agent,
          config: {
            capability: AgentCapability.TextGeneration,
            agentConfig: {
              model: 'gpt-4o',
              temperature: 0.7,
              maxTokens: 1000,
            },
          },
        },

        // Condition node - check if we need follow-up processing
        check_follow_up: {
          type: NodeType.Condition,
          config: {
            check: (state: GraphState) => {
              // Look for indicators that follow-up might be needed
              const latestAssistantMessage = [...state.messages]
                .reverse()
                .find(msg => msg.role === 'assistant');

              if (!latestAssistantMessage) {
                return 'end';
              }

              const content = latestAssistantMessage.content.toLowerCase();

              // Check if the response indicates a need for additional information
              if (
                content.includes('need more information') ||
                content.includes('could you clarify') ||
                content.includes('please provide more details')
              ) {
                return 'follow_up';
              }

              return 'end';
            },
          },
        },

        // Follow-up node for additional processing when needed
        follow_up: {
          type: NodeType.Tool,
          config: {
            name: 'prepare_follow_up',
            execute: async (state: GraphState) => {
              // Add a message indicating follow-up is needed
              return {
                ...state,
                needsFollowUp: true,
                followUpReason:
                  'Additional information may be required to fully answer the query',
              };
            },
          },
        },

        // End node for completing the workflow
        end: {
          type: NodeType.Tool,
          config: {
            name: 'finalize_response',
            execute: async (state: GraphState) => {
              // Finalize the state and prepare for return
              return {
                ...state,
                completed: true,
                completedAt: new Date().toISOString(),
              };
            },
          },
        },
      },
      edges: {
        prepare: 'retrieve_context',
        retrieve_context: 'generate_text',
        generate_text: 'check_follow_up',
        check_follow_up: {
          follow_up: state => state.needsFollowUp === true,
          end: state => state.needsFollowUp !== true,
        },
        follow_up: 'end',
      },
    };
  }

  /**
   * Execute the text generation graph
   */
  async run(initialState: Partial<GraphState> = {}): Promise<GraphState> {
    // Initialize state with defaults if not provided
    const state = this.stateManager.createInitialState(initialState);

    // Create the graph executor
    const executor = new GraphExecutor(this.graphDefinition, this.nodeFactory);

    // Execute the graph
    return await executor.run(state);
  }

  /**
   * Execute the graph with streaming support
   */
  async streamExecution(
    initialState: Partial<GraphState> = {}
  ): Promise<AsyncIterable<{ node: string; state: GraphState }>> {
    // Initialize state with defaults if not provided
    const state = this.stateManager.createInitialState(initialState);

    // Create the graph executor
    const executor = new GraphExecutor(this.graphDefinition, this.nodeFactory);

    // Stream execution
    return executor.streamExecution(state);
  }
}
