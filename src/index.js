// https://github.com/babel/babel/blob/d383659ca6adec54b6054f77cdaa16da88e8a171/packages/babel-helper-transform-fixture-test-runner/src/index.js#L128

export default function checkDuplicatedNodes(babel, ast) {
  const nodes = new WeakSet()
  const parents = new WeakMap()

  const setParent = (child, parent) => {
    if (typeof child === 'object' && child !== null) {
      let p = parents.get(child)
      if (!p) {
        p = []
        parents.set(child, p)
      }
      p.unshift(parent)
    }
  }

  const registerChildren = node => {
    for (const key in node) {
      if (Array.isArray(node[key])) {
        node[key].forEach(child => setParent(child, node))
      } else {
        setParent(node[key], node)
      }
    }
  }

  const hidePrivateProperties = (key, val) => {
    // Hides properties like _shadowedFunctionLiteral,
    // which makes the AST circular
    if (key[0] === '_') return '[Private]'
    return val
  }

  /* https://github.com/babel/babel/blob/bff6298578df194324e42a002b4b337d65bf0eb3/packages/babel-parser/test/helpers/runFixtureTests.js#L110 */
  const compactFixture = (jsonString) => {
    return jsonString.replace(
      /"loc": \{\s+"start":\s\{\s+"line": (\d+),\s+"column": (\d+)\s+\},\s+"end":\s\{\s+"line": (\d+),\s+"column": (\d+)\s+\s+\}(?:,\s+"identifierName": "(\S+)")?\s+\}/gm,
      (_, p1, p2, p3, p4, p5) => {
        return (
          `"loc":{"start":{"line":${p1},"column":${p2}},"end":{"line":${p3},"column":${p4}}` +
          (p5 ? `,"identifierName":"${p5}"}` : "}")
        );
      },
    );
  }

  const formatASTNode = (node) => {
    return compactFixture(JSON.stringify(node, hidePrivateProperties, 2));
  }

  babel.types.traverseFast(ast, node => {
    registerChildren(node)

    if (nodes.has(node)) {
      throw new Error(
        'Do not reuse nodes. Use `t.cloneNode` (or `t.clone`/`t.cloneDeep` if using babel@6) to copy them.\n' +
          formatASTNode(node) +
          '\nParent:\n' +
          formatASTNode(parents.get(node)),
      )
    }

    nodes.add(node)
  })
}
