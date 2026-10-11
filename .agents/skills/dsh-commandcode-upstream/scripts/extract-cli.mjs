// Static data extraction only: never import/eval the downloaded CLI.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export function extract(file, repo, local = false) {
  const require = createRequire(path.join(path.resolve(repo), 'package.json'));
  const ts = require('typescript');
  const program = ts.createProgram([file], { allowJs: true, noResolve: true, target: ts.ScriptTarget.Latest });
  const source = program.getSourceFile(file);
  if (!source || source.parseDiagnostics.length) throw Error('CLI syntax parse failed');
  const checker = program.getTypeChecker();
  const bindings = new Map(), functions = new Map();
  const visit = (node, fn) => { fn(node); ts.forEachChild(node, child => visit(child, fn)); };
  const add = (name, value) => {
    const symbol = checker.getSymbolAtLocation(name);
    if (symbol && value) bindings.set(symbol, [...(bindings.get(symbol) ?? []), value]);
  };
  visit(source, n => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) add(n.name, n.initializer);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) add(n.left, n.right);
    if (ts.isFunctionDeclaration(n) && n.name) functions.set(n.name.text, [...(functions.get(n.name.text) ?? []), n]);
  });
  function deref(n, seen = new Set()) {
    if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n) || ts.isSatisfiesExpression(n)) return deref(n.expression, seen);
    if (!ts.isIdentifier(n)) return n;
    const symbol = checker.getSymbolAtLocation(n), values = bindings.get(symbol);
    if (!values || values.length !== 1 || seen.has(symbol)) throw Error(`Unresolved/ambiguous binding: ${n.text}`);
    return deref(values[0], new Set([...seen, symbol]));
  }
  /**
   * The NODE a member access denotes (`Enum.MEMBER` / `Enum.MEMBER.id`),
   * resolved through bound object literals. Returns the member's initializer
   * node rather than its value, so a sibling field the extractor cannot
   * statically evaluate (`provider: SomeRef`) never blocks reading `id`.
   */
  function memberNode(n) {
    if (ts.isPropertyAccessExpression(n)) {
      const container = ts.isIdentifier(n.expression) ? deref(n.expression) : memberNode(n.expression);
      if (!ts.isObjectLiteralExpression(container)) throw Error(`Unsupported static member access: ${n.getText(source).slice(0, 100)}`);
      const property = container.properties.find(p => ts.isPropertyAssignment(p) && p.name?.text === n.name.text);
      if (!property) throw Error(`Missing object member: ${n.name.text}`);
      return property.initializer;
    }
    return deref(n);
  }
  function value(n) {
    n = deref(n);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) return !value(n.operand);
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(value);
    if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.map(p => {
      if (!ts.isPropertyAssignment(p) || !p.name.text) throw Error('Unsupported object property');
      return [p.name.text, value(p.initializer)];
    }));
    if (ts.isNewExpression(n) && n.expression.getText(source) === 'Map' && n.arguments?.length === 1) {
      const pairs = value(n.arguments[0]);
      if (pairs.some(p => !Array.isArray(p) || p.length !== 2) || new Set(pairs.map(p => p[0])).size !== pairs.length) throw Error('Invalid or duplicate Map entries');
      return Object.fromEntries(pairs);
    }
    if (ts.isNewExpression(n) && n.expression.getText(source) === 'Set' && n.arguments?.length === 1) return value(n.arguments[0]);
    if (ts.isPropertyAccessExpression(n)) return value(memberNode(n));
    throw Error(`Unsupported static expression: ${n.getText(source).slice(0, 100)}`);
  }
  function anchor(name) {
    const nodes = functions.get(name);
    if (nodes?.length !== 1) throw Error(`Missing/ambiguous function anchor: ${name}`);
    return nodes[0];
  }
  function unique(nodes, label) {
    const distinct = [...new Set(nodes.map(derefNode => deref(derefNode)))];
    if (distinct.length !== 1) throw Error(`Missing/ambiguous ${label}`);
    return distinct[0];
  }
  /**
   * The Set a predicate negates with `!SOME_SET.has(...)`, read from a named
   * function anchor. The ZDR capability predicates are exactly this shape
   * (`modelSupportsZdr(e){return !iD.has(getCanonicalModelId(e))}`), so the
   * set identity comes from the receiver of `.has` — never from a variable
   * name, which minification changes per release. The receiver may itself be
   * built from enum members (`new Set([eD.MEMBER.id, ...])`), resolved by the
   * property-access branch of `value()`.
   */
  function negatedSet(name, label) {
    const receivers = [];
    visit(anchor(name), n => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'has') receivers.push(n.expression.expression);
    });
    const distinct = [...new Set(receivers.map(r => JSON.stringify(value(deref(r)))))];
    if (distinct.length !== 1) throw Error(`Missing/ambiguous ${label}`);
    const set = JSON.parse(distinct[0]);
    if (!Array.isArray(set) || !set.length || set.some(x => typeof x !== 'string')) throw Error(`Invalid ${label}`);
    return set;
  }
  if (local) {
    const wanted = ['KNOWN_EFFORTS', 'KNOWN_IMAGE_MODELS', 'KNOWN_THINKING_MODELS', 'KNOWN_PLANS', 'KNOWN_SUBSCRIPTION_PLANS', 'KNOWN_DEALS', 'KNOWN_PEAK_PRICING', 'PEAK_HOUR_RANGES', 'KNOWN_NON_ZDR_MODELS'];
    const snapshots = {};
    visit(source, n => {
      if (ts.isVariableDeclaration(n) && wanted.includes(n.name.text)) snapshots[n.name.text] = value(n.initializer);
    });
    if (Object.keys(snapshots).length !== wanted.length) throw Error('Missing local snapshot');
    return snapshots;
  }
  const mapRefs = [];
  visit(anchor('getSupportedEfforts'), n => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'get') mapRefs.push(n.expression.expression);
  });
  const efforts = value(unique(mapRefs, 'effort map'));
  if (!Object.keys(efforts).length || Object.values(efforts).some(x => !Array.isArray(x) || !x.length || x.some(y => typeof y !== 'string'))) throw Error('Invalid effort map');
  const tableRefs = [];
  visit(anchor('buildModelGroups'), n => {
    if (ts.isCallExpression(n) && n.expression.getText(source) === 'Object.values' && n.arguments.length === 1) {
      const table = deref(n.arguments[0]);
      if (ts.isObjectLiteralExpression(table) && table.properties.some(p => ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer) && p.initializer.properties.some(q => q.name?.text === 'inputModalities'))) tableRefs.push(n.arguments[0]);
    }
  });
  const models = [];
  for (const p of unique(tableRefs, 'model registry').properties) {
    if (!ts.isPropertyAssignment(p)) throw Error('Unsupported registry spread');
    const row = deref(p.initializer);
    if (!ts.isObjectLiteralExpression(row)) throw Error('Invalid registry row');
    const model = {};
    for (const field of row.properties) {
      if (ts.isGetAccessorDeclaration(field) && field.name.text === 'hidden') {
        model.hiddenExpression = field.getText(source);
        continue;
      }
      if (!ts.isPropertyAssignment(field)) throw Error(`Unsupported model property: ${field.getText(source).slice(0, 160)}`);
      if (['id', 'name', 'inputModalities', 'reasoning', 'reasoningEfforts', 'contextWindow', 'hidden', 'provider', 'spec'].includes(field.name.text)) model[field.name.text] = value(field.initializer);
    }
    if (typeof model.id !== 'string' || !Array.isArray(model.inputModalities)) throw Error('Invalid model');
    models.push(model);
  }
  if (!models.length || new Set(models.map(m => m.id)).size !== models.length) throw Error('Empty/duplicate model registry');
  const plans = [];
  visit(anchor('getPlanInfo'), n => {
    if (ts.isElementAccessExpression(n)) {
      try { const v = value(n.expression); if (v && !Array.isArray(v) && Object.hasOwn(v, 'individual-go')) plans.push(v); } catch {}
    }
  });
  const candidates = [...new Map(plans.map(p => [JSON.stringify(p), p])).values()];
  const creditMaps = candidates.filter(p => Object.values(p).every(x => typeof x === 'number' && Number.isFinite(x)));
  const nameMaps = candidates.filter(p => Object.values(p).every(x => typeof x === 'string'));
  if (creditMaps.length !== 1 || nameMaps.length !== 1) throw Error('Missing/ambiguous subscription maps');
  const credits = creditMaps[0], names = nameMaps[0];
  if (JSON.stringify(Object.keys(credits).sort()) !== JSON.stringify(Object.keys(names).sort())) throw Error('Subscription key mismatch');
  // Zero data retention: the provider's `x-cmd-zdr: 1` opt-in is model-scoped
  // — a model with no ZDR-capable upstream is REFUSED (422
  // cmd_zdr_no_providers), and the CLI's own picker hides it under the same
  // flag. The authoritative per-model answer is the exclusion set behind the
  // CLI's `modelSupportsZdr` predicate; `knownModelSupportsZdr` carries the
  // sibling route table's membership. Both anchors are read when present and
  // unioned, and a release that drops either keeps the remaining one. A
  // release that drops BOTH is a loud failure — silently returning "every
  // model is covered" would let the plugin's ZDR switch fail live requests.
  const zdrAnchors = ['modelSupportsZdr', 'knownModelSupportsZdr'].filter(name => functions.has(name));
  if (!zdrAnchors.length) throw Error('Missing ZDR anchor');
  const zdrSets = Object.fromEntries(zdrAnchors.map(name => [name, negatedSet(name, `ZDR exception set (${name})`)]));
  const zdrExceptions = [...new Set(zdrAnchors.flatMap(name => zdrSets[name]))].sort();
  return { efforts, models, subscriptions: Object.fromEntries(Object.keys(credits).map(id => [id, { name: names[id], monthlyCredits: credits[id] }])), zdrAnchors, zdrSets, zdrExceptions, anchors: ['getSupportedEfforts', 'buildModelGroups', 'getPlanInfo', ...zdrAnchors] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try { console.log(JSON.stringify(extract(path.resolve(process.argv[2]), process.argv[3] ?? process.cwd(), process.argv.includes('--local')), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
