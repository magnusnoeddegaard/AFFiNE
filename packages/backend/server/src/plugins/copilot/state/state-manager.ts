import { GraphState } from '../types';

/**
 * Type definition for state transformer functions
 */
export type StateTransformer = (
  state: GraphState, 
  input?: any
) => Promise<GraphState> | GraphState;

/**
 * Class for managing graph state
 */
export class StateManager {
  /**
   * Create an initial state object
   * @param initialState Partial state to initialize with
   * @returns Complete GraphState object
   */
  createInitialState(initialState: Partial<GraphState> = {}): GraphState {
    return {
      messages: [],
      currentNode: 'start',
      visitedNodes: [],
      artifacts: [],
      ...initialState,
    };
  }

  /**
   * Apply a state transformer to the current state
   * @param state Current state
   * @param transformer Transformer function to apply
   * @param input Optional input to pass to the transformer
   * @returns Updated state
   */
  async applyTransformer(
    state: GraphState,
    transformer: StateTransformer,
    input?: any
  ): Promise<GraphState> {
    const result = transformer(state, input);
    return result instanceof Promise ? await result : result;
  }

  /**
   * Apply multiple transformers in sequence
   * @param state Current state
   * @param transformers Array of transformer functions
   * @param input Optional input to pass to each transformer
   * @returns Updated state
   */
  async applyTransformers(
    state: GraphState,
    transformers: StateTransformer[],
    input?: any
  ): Promise<GraphState> {
    let currentState = { ...state };
    
    for (const transformer of transformers) {
      currentState = await this.applyTransformer(currentState, transformer, input);
    }
    
    return currentState;
  }

  /**
   * Serialize state to JSON string
   * @param state State to serialize
   * @returns JSON string representation
   */
  serialize(state: GraphState): string {
    return JSON.stringify(state);
  }

  /**
   * Deserialize JSON string to GraphState
   * @param serialized Serialized state JSON
   * @returns Deserialized GraphState
   */
  deserialize(serialized: string): GraphState {
    return JSON.parse(serialized) as GraphState;
  }
}

/**
 * Common state transformers
 */
export const StateTransformers = {
  /**
   * Add a message to the state
   * @param state Current state
   * @param message Message to add
   * @returns Updated state with new message
   */
  addMessage: (state: GraphState, message: any) => ({
    ...state,
    messages: [...state.messages, message]
  }),

  /**
   * Update the current node
   * @param state Current state
   * @param nodeName Name of the new current node
   * @returns Updated state with new current node
   */
  updateCurrentNode: (state: GraphState, nodeName: string) => ({
    ...state,
    currentNode: nodeName,
    visitedNodes: [...state.visitedNodes, nodeName]
  }),

  /**
   * Add an artifact to the state
   * @param state Current state
   * @param artifact Artifact to add
   * @returns Updated state with new artifact
   */
  addArtifact: (state: GraphState, artifact: any) => ({
    ...state,
    artifacts: [...state.artifacts, artifact]
  }),

  /**
   * Clear messages in the state
   * @param state Current state
   * @returns State with empty messages array
   */
  clearMessages: (state: GraphState) => ({
    ...state,
    messages: []
  }),

  /**
   * Merge a partial state into the current state
   * @param state Current state
   * @param partialState Partial state to merge
   * @returns Updated state with merged properties
   */
  mergeState: (state: GraphState, partialState: Partial<GraphState>) => ({
    ...state,
    ...partialState
  })
}