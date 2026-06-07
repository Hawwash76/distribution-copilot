import globals from "globals";

import base from "./base.js";

/** ESLint config for plain Node.js services and libraries. */
export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
