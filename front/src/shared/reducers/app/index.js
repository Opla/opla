/**
 * Copyright (c) 2015-present, CWB SAS
 *
 * This source code is licensed under the GPL v2.0+ license found in the
 * LICENSE file in the root directory of this source tree.
 */
import createReducer from "zoapp-front/dist/reducers/createReducer";

import {
  initialState as zoappInitialState,
  handlers as zoappHandlers,
} from "zoapp-front/dist/reducers/app";

import {
  AUTH_SIGNOUT,
  FETCH_FAILURE,
  FETCH_REQUEST,
  FETCH_SUCCESS,
} from "zoapp-front/dist/actions/constants";

import {
  API_DELETEMIDDLEWARE,
  API_GETLANGUAGES,
  API_GETMIDDLEWARES,
  API_GETTEMPLATES,
  API_IMPORT,
  API_PUBLISH,
  API_SB_GETCONTEXT,
  API_SB_GETMESSAGES,
  API_SB_RESET,
  API_SB_SENDMESSAGE,
  API_SETMIDDLEWARE,
  APP_UPDATEPUBLISHER,
  APP_SET_SB_CONVERSATION,
  API_GET_VARIABLES,
  API_SET_VARIABLES,
  API_GET_ENTITIES,
} from "../../actions/constants";

import {
  initialState as intentInitialState,
  handlers as intentHandlers,
} from "./intents";

import {
  initialState as appInitialState,
  handlers as appHandlers,
} from "./app";

import {
  initialState as botInitialState,
  handlers as botHandlers,
} from "./bot";

export const defaultTemplates = [
  { id: "eb05e2a4-251a-4e11-a907-b1f3bcc20283", name: "Empty" },
  { id: "571a2354-ec80-4423-8edb-94d0a934fbb6", name: "Import" },
];
export const defaultLanguages = [{ id: "en", name: "English", default: true }];

export const initialState = {
  ...zoappInitialState,
  ...appInitialState,
  ...intentInitialState,
  ...botInitialState,
  sandbox: null,
  loadingMessages: false,
  templates: defaultTemplates,
  languages: defaultLanguages,
  variables: [],
  entities: [],
};

export default createReducer(initialState, {
  ...zoappHandlers,
  ...appHandlers,
  ...intentHandlers,
  ...botHandlers,

  [API_GETMIDDLEWARES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
    lastMiddleware: null,
  }),
  [API_GETMIDDLEWARES + FETCH_SUCCESS]: (state, { middlewares }) => ({
    ...state,
    loading: false,
    error: null,
    middlewares: [...middlewares],
  }),
  [API_GETMIDDLEWARES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  [API_SETMIDDLEWARE + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
    lastMiddleware: null,
  }),
  [API_SETMIDDLEWARE + FETCH_SUCCESS]: (state, { middleware }) => {
    const middlewares = [];
    let v = true;
    state.middlewares.forEach((m) => {
      if (m.id === middleware.id) {
        middlewares.push({ ...middleware });
        v = false;
      } else {
        middlewares.push(m);
      }
    });
    if (v) {
      middlewares.push({ ...middleware });
    }
    return {
      ...state,
      loading: false,
      error: null,
      middlewares,
      lastMiddleware: { ...middleware },
    };
  },
  [API_SETMIDDLEWARE + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  [API_DELETEMIDDLEWARE + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
    lastMiddleware: null,
  }),
  [API_DELETEMIDDLEWARE + FETCH_SUCCESS]: (state, { middlewareId }) => {
    const middlewares = [];
    state.middlewares.forEach((m) => {
      if (m.id !== middlewareId) {
        middlewares.push(m);
      }
    });
    return {
      ...state,
      loading: false,
      error: null,
      middlewares,
    };
  },
  [API_DELETEMIDDLEWARE + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),
  [API_IMPORT + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_IMPORT + FETCH_SUCCESS]: (state, { result }) => {
    const res = result;
    let { intents, selectedIntentIndex, selectedIntent } = state;
    if (result.intents) {
      intents = [...result.intents];
      if (selectedIntentIndex >= intents.length) {
        selectedIntentIndex = 0;
      }
      if (intents && (!selectedIntent || !selectedIntent.notSaved)) {
        selectedIntent = { ...intents[selectedIntentIndex] };
      } else if (!selectedIntent && !selectedIntent.notSaved) {
        selectedIntent = null;
      } else {
        // TODO handle conflicts
      }
    }

    delete res.intents;
    const bots = state.bots.slice();
    const savedBotIndex = bots.findIndex((b) => b.id === res.id);
    if (savedBotIndex > -1) {
      bots[savedBotIndex] = {
        ...bots[savedBotIndex],
        ...res,
      };
    }

    return {
      ...state,
      loading: false,
      error: null,
      intents,
      selectedIntentIndex,
      selectedIntent,
      bots,
    };
  },
  [API_IMPORT + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  [API_PUBLISH + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_PUBLISH + FETCH_SUCCESS]: (state, { result }) => {
    let { intents, selectedIntentIndex, selectedIntent } = state;
    if (result.intents) {
      intents = [...result.intents];
      if (selectedIntentIndex >= intents.length) {
        selectedIntentIndex = 0;
      }
      if (intents && (!selectedIntent || !selectedIntent.notSaved)) {
        selectedIntent = { ...intents[selectedIntentIndex] };
      } else if (!selectedIntent && !selectedIntent.notSaved) {
        selectedIntent = null;
      } else {
        // TODO handle conflicts
      }
    }
    return {
      ...state,
      loading: false,
      error: null,
      intents,
      selectedIntentIndex,
      selectedIntent,
    };
  },
  [API_PUBLISH + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  /* API Sandbox section */
  [API_SB_GETMESSAGES + FETCH_REQUEST]: (state) => ({
    ...state,
    loadingMessages: true,
    error: null,
  }),
  [API_SB_GETMESSAGES + FETCH_SUCCESS]: (state, { conversations }) => {
    // WIP, TODO check if BotId is ok
    let { sandbox } = state;
    if (!sandbox) {
      sandbox = {};
    }
    if (conversations) {
      sandbox.conversations = [...conversations];
    } else {
      sandbox.conversations = [];
    }
    return {
      ...state,
      loadingMessages: false,
      error: null,
      sandbox,
    };
  },
  [API_SB_GETMESSAGES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loadingMessages: false,
    error,
  }),

  [API_SB_SENDMESSAGE + FETCH_REQUEST]: (state) => ({
    ...state,
    loadingMessages: true,
    error: null,
  }),
  [API_SB_SENDMESSAGE + FETCH_SUCCESS]: (state) => {
    // TODO , { conversationId, message }
    const { sandbox } = state;
    // sandbox.conversations = [...conversations];
    return {
      ...state,
      loadingMessages: false,
      error: null,
      sandbox,
    };
  },
  [API_SB_SENDMESSAGE + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loadingMessages: false,
    error,
  }),

  [API_SB_GETCONTEXT + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_SB_GETCONTEXT + FETCH_SUCCESS]: (state, { context }) => {
    // TODO check if BotId is ok
    const { sandbox } = state;
    sandbox.context = [...context];
    return {
      ...state,
      loading: false,
      error: null,
      sandbox,
    };
  },
  [API_SB_GETCONTEXT + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  [API_SB_RESET + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_SB_RESET + FETCH_SUCCESS]: (state, { conversations }) => {
    // TODO check if BotId is ok
    const sandbox = { conversations };
    return {
      ...state,
      loading: false,
      error: null,
      sandbox,
    };
  },
  [API_SB_RESET + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),

  /* APP Section */
  [APP_UPDATEPUBLISHER]: (state, { selectedBotId, publisher }) => {
    const publishers = { ...state.publishers };
    if (state.selectedBotId === selectedBotId) {
      const { name } = publisher;
      publishers[name] = { ...publisher };
    }
    return { ...state, publishers };
  },

  /* Auth section */
  [AUTH_SIGNOUT + FETCH_SUCCESS]: (state) => ({
    ...state,
    ...initialState,
  }),

  /* Api admin section */
  [API_GETTEMPLATES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_GETTEMPLATES + FETCH_SUCCESS]: (state, { templates }) => ({
    ...state,
    loading: false,
    error: null,
    templates: templates.concat(defaultTemplates),
  }),
  [API_GETTEMPLATES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error: error.message,
    templates: defaultTemplates,
  }),

  [API_GETLANGUAGES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_GETLANGUAGES + FETCH_SUCCESS]: (state, { languages }) => ({
    ...state,
    loading: false,
    error: null,
    languages,
  }),
  [API_GETLANGUAGES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error: error.message,
    languages: defaultLanguages,
  }),
  [APP_SET_SB_CONVERSATION]: (state, { sandbox }) => ({
    ...state,
    sandbox,
  }),
  [API_GET_VARIABLES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_GET_VARIABLES + FETCH_SUCCESS]: (state, { variables }) => ({
    ...state,
    loading: false,
    error: null,
    variables,
  }),
  [API_GET_VARIABLES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),
  [API_SET_VARIABLES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_SET_VARIABLES + FETCH_SUCCESS]: (state, { variables }) => ({
    ...state,
    loading: false,
    error: null,
    variables,
  }),
  [API_SET_VARIABLES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),
  [API_GET_ENTITIES + FETCH_REQUEST]: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  [API_GET_ENTITIES + FETCH_SUCCESS]: (state, { entities }) => ({
    ...state,
    loading: false,
    error: null,
    entities,
  }),
  [API_GET_ENTITIES + FETCH_FAILURE]: (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }),
});
