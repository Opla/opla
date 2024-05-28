// Copyright 2024 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export const ANCHOR_CLASS_NAME =
  'font-semibold underline  underline-offset-[2px] decoration-1 transition-colors';

export const MARKDOWN_TEST_MESSAGE = `
    # Heading level 1
    
    This is the first paragraph.
    
    This is the second paragraph.
    
    This is the third paragraph.
    
    ## Heading level 2
    
    This is an [anchor](https://github.com).
    
    ### Heading level 3
    
    This is **bold** and _italics_.
    
    #### Heading level 4
    
    This is \`inline\` code.
    
    This is a code block:
    
    \`\`\`tsx
    const Message = () => {
      return <div>hi</div>;
    };
    \`\`\`
    
    ##### Heading level 5
    
    This is an unordered list:
    
    - One
    - Two
    - Three, and **bold**
    
    This is an ordered list:
    
    1. One
    1. Two
    1. Three
    
    This is a complex list:
    
    1. **Bold**: One
        - One
        - Two
        - Three
      
    2. **Bold**: Three
        - One
        - Two
        - Three
      
    3. **Bold**: Four
        - One
        - Two
        - Three
    
    ###### Heading level 6
    
    > This is a blockquote.
    
    This is a table:
    
    | Vegetable | Description |
    |-----------|-------------|
    | Carrot    | A crunchy, orange root vegetable that is rich in vitamins and minerals. It is commonly used in soups, salads, and as a snack. |
    | Broccoli  | A green vegetable with tightly packed florets that is high in fiber, vitamins, and antioxidants. It can be steamed, boiled, stir-fried, or roasted. |
    | Spinach   | A leafy green vegetable that is dense in nutrients like iron, calcium, and vitamins. It can be eaten raw in salads or cooked in various dishes. |
    | Bell Pepper | A colorful, sweet vegetable available in different colors such as red, yellow, and green. It is often used in stir-fries, salads, or stuffed recipes. |
    | Tomato    | A juicy fruit often used as a vegetable in culinary preparations. It comes in various shapes, sizes, and colors and is used in salads, sauces, and sandwiches. |
    | Cucumber   | A cool and refreshing vegetable with a high water content. It is commonly used in salads, sandwiches, or as a crunchy snack. |
    | Zucchini | A summer squash with a mild flavor and tender texture. It can be sautéed, grilled, roasted, or used in baking recipes. |
    | Cauliflower | A versatile vegetable that can be roasted, steamed, mashed, or used to make gluten-free alternatives like cauliflower rice or pizza crust. |
    | Green Beans | Long, slender pods that are low in calories and rich in vitamins. They can be steamed, stir-fried, or used in casseroles and salads. |
    | Potato | A starchy vegetable available in various varieties. It can be boiled, baked, mashed, or used in soups, fries, and many other dishes. |
    
    This is a mermaid diagram:
    
    \`\`\`mermaid
    gitGraph
        commit
        commit
        branch develop
        checkout develop
        commit
        commit
        checkout main
        merge develop
        commit
        commit
    \`\`\`
    
    \`\`\`latex
    \\[F(x) = \\int_{a}^{b} f(x) \\, dx\\]
    \`\`\`
    `;
