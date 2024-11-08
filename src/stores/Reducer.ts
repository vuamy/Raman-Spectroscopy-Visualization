// Define action types
export const ACTIONS = { INCREMENT: 'increment' };

interface Action{
    type: string;
}

interface State{
    count: number;
}

// Define initial state
const initialState: State = { count: 0 };

// reducer function
export const reducer = (state: State, action: Action) => { 
    switch (action.type) {
        case ACTIONS.INCREMENT:
            return { count: state.count + 1 };
        default:
            return state;
    }
}

export type { State, Action };