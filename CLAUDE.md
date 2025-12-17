1. You MUST keep files to under 700 lines. If you are about to make a change to a file that will exceed this length, you MUST first refactor the file to better organize before making the change. This is urgent.

2. Always create unit tests for all backend functionality, and make sure that all tests pass after every update.

3. Add a README in each subdirectory that explains its code. If you make a change with key logic, it is ESSENTIAL that you document it.

4. Always make sure the app builds after an update

5. Follow the established subdirectory organization pattern:

   - Group related components into subdirectories (e.g., `modals/`, `cards/`, `viewers/`)
   - Use barrel exports (`index.ts`) in each subdirectory for clean imports
   - Extract large StyleSheet definitions into separate `styles/` subdirectories
   - When a component exceeds ~500 lines, consider extracting hooks, subcomponents, or styles

6. STYLING AND THEMING REQUIREMENTS:

   - NEVER use hardcoded colors

   - NEVER use emoji characters for icons.
