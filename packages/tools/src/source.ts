import ts from "typescript";
import type { Diagnostic, KeyReference, SourceProject, TranslationFactory } from "./types";

function expressionName(node: ts.Expression): string {
	if (ts.isIdentifier(node)) return node.text;
	if (ts.isPropertyAccessExpression(node))
		return `${expressionName(node.expression)}.${node.name.text}`;
	return "";
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
	for (const member of object.properties) {
		if (
			ts.isPropertyAssignment(member) &&
			(ts.isIdentifier(member.name) || ts.isStringLiteralLike(member.name)) &&
			member.name.text === name
		)
			return member.initializer;
	}
	return undefined;
}

function keyPattern(node: ts.Expression): string | undefined {
	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isTemplateExpression(node)) {
		return node.head.text + node.templateSpans.map((span) => `*${span.literal.text}`).join("");
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return `${keyPattern(node.left) ?? "*"}${keyPattern(node.right) ?? "*"}`;
	}
	return undefined;
}

function factoryNamespace(
	call: ts.CallExpression,
	factory: TranslationFactory
): string | undefined {
	const argument = call.arguments[0];
	if (argument && factory.argument !== "namespace" && !ts.isObjectLiteralExpression(argument))
		return undefined;
	const namespace =
		argument && factory.argument === "namespace"
			? argument
			: argument && ts.isObjectLiteralExpression(argument)
				? property(argument, "namespace")
				: undefined;
	if (namespace && !ts.isStringLiteralLike(namespace)) return undefined;
	return [factory.baseNamespace, namespace?.text].filter(Boolean).join(":");
}

function enclosingScope(node: ts.Node): ts.Node {
	let parent = node.parent;
	while (!ts.isSourceFile(parent) && !ts.isBlock(parent)) parent = parent.parent;
	return parent;
}

export function readSource(
	file: string,
	code: string,
	project: SourceProject
): { references: KeyReference[]; diagnostics: Diagnostic[]; literals: string[] } {
	const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const scopes = new Map<ts.Node, Map<string, string | undefined>>();
	const references: KeyReference[] = [];
	const diagnostics: Diagnostic[] = [];
	const literals: string[] = [];
	const factories = project.factories ?? [{ name: "useT" }, { name: "*.getT" }];

	function factoryFor(call: ts.CallExpression) {
		const name = expressionName(call.expression);
		return factories.find((factory) =>
			factory.name.startsWith("*.")
				? name.endsWith(factory.name.slice(1))
				: name === factory.name
		);
	}

	function collect(node: ts.Node) {
		if (ts.isStringLiteralLike(node)) literals.push(node.text);
		if (ts.isFunctionLike(node)) {
			const scope = "body" in node && node.body ? node.body : node;
			const bindings = scopes.get(scope) ?? new Map<string, string | undefined>();
			for (const parameter of node.parameters) {
				if (ts.isIdentifier(parameter.name)) bindings.set(parameter.name.text, undefined);
			}
			scopes.set(scope, bindings);
		}
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
			const scope = enclosingScope(node);
			const bindings = scopes.get(scope) ?? new Map<string, string | undefined>();
			bindings.set(node.name.text, undefined);
			scopes.set(scope, bindings);
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer)
		) {
			const factory = factoryFor(node.initializer);
			if (factory) {
				const namespace = factoryNamespace(node.initializer, factory);
				if (namespace !== undefined) {
					const scope = enclosingScope(node);
					let bindings = scopes.get(scope);
					if (!bindings) {
						bindings = new Map();
						scopes.set(scope, bindings);
					}
					bindings.set(node.name.text, namespace);
				}
			}
		}
		ts.forEachChild(node, collect);
	}
	collect(source);

	function translateNamespace(node: ts.CallExpression): string | undefined {
		const name = expressionName(node.expression);
		if (project.functions?.[name] !== undefined) return project.functions[name];
		if (ts.isCallExpression(node.expression)) {
			const factory = factoryFor(node.expression);
			if (factory) return factoryNamespace(node.expression, factory);
		}
		let scope: ts.Node | undefined = node;
		while (scope) {
			const bindings = scopes.get(scope);
			if (bindings?.has(name))
				return bindings.get(name) ?? (name === "t" ? project.namespace : undefined);
			scope = scope.parent;
		}
		return name === "t" ? project.namespace : undefined;
	}

	function visit(node: ts.Node) {
		if (ts.isCallExpression(node)) {
			const factory = factoryFor(node);
			if (factory && factoryNamespace(node, factory) === undefined) {
				diagnostics.push({
					file,
					line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
					code: "dynamic-namespace",
					severity: "warning",
					message: `Dynamic namespace: ${node.getText()}`,
				});
			}
			const namespace = translateNamespace(node);
			const key = node.arguments[0];
			if (namespace !== undefined && key) {
				const pattern = keyPattern(key);
				const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
				const vars = node.arguments[1];
				const variables =
					vars &&
					ts.isObjectLiteralExpression(vars) &&
					!vars.properties.some(ts.isSpreadAssignment)
						? vars.properties.map((member) =>
								ts.isShorthandPropertyAssignment(member)
									? member.name.text
									: (member.name
											?.getText()
											.replaceAll('"', "")
											.replaceAll("'", "") ?? "")
							)
						: vars
							? undefined
							: [];
				if (pattern === undefined || pattern === "*") {
					diagnostics.push({
						file,
						line,
						code: "dynamic-key",
						severity: "warning",
						message: `Indirect translation key in ${namespace}: ${key.getText()}`,
					});
				} else {
					references.push({ file, line, namespace, pattern, variables });
				}
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	return { references, diagnostics, literals };
}
