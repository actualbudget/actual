"use client";

import React from "react";
import type { FormulaNode } from "./FormulaEditor";
import { Text } from "@actual-app/components/text";
import { View } from "@actual-app/components/view";
import { Card } from "@actual-app/components/card";

interface FormulaRunnerProps {
  formula: FormulaNode;
}

export function FormulaRunner({ formula }: FormulaRunnerProps) {
  const calculateFormula = (node: FormulaNode): number => {
    switch (node.type) {
      case "value":
        return Number(node.value);
      case "sum":
        if (!node.from || !node.to || !node.right)
          throw new Error("Invalid sum node");
        let total = 0;
        for (
          let i = calculateFormula(node.from);
          i <= calculateFormula(node.to);
          i++
        ) {
          total += calculateFormula(node.right);
        }
        return total;
      case "division":
        if (!node.left || !node.right)
          throw new Error("Invalid division node");
        return calculateFormula(node.left) / calculateFormula(node.right);
      case "multiplication":
        if (!node.left || !node.right)
          throw new Error("Invalid multiplication node");
        return calculateFormula(node.left) * calculateFormula(node.right);
      case "addition":
        if (!node.left || !node.right)
          throw new Error("Invalid addition node");
        return calculateFormula(node.left) + calculateFormula(node.right);
      case "subtraction":
        if (!node.left || !node.right)
          throw new Error("Invalid subtraction node");
        return calculateFormula(node.left) - calculateFormula(node.right);
      case "power":
        if (!node.base || !node.exponent)
          throw new Error("Invalid power node");
        return Math.pow(calculateFormula(node.base), calculateFormula(node.exponent));
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  };

  // Render the formula (a simple textual representation)
  const renderFormula = (node: FormulaNode): React.ReactNode => {
    switch (node.type) {
      case "value":
        return <Text>{node.value}</Text>;
      case "sum":
        return (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: "2rem", marginRight: "0.25rem" }}>Σ</Text>
            <View style={{ flexDirection: "column", alignItems: "center" }}>
              <Text>{renderFormula(node.to)}</Text>
              <Text>{renderFormula(node.from)}</Text>
            </View>
            <Text style={{ marginLeft: "0.25rem" }}>
              {renderParentheses(node.right)}
            </Text>
          </View>
        );
      case "division":
        return (
          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <Text>{renderParentheses(node.left)}</Text>
            <View style={{ width: "100%", height: "1px", backgroundColor: "black" }} />
            <Text>{renderParentheses(node.right)}</Text>
          </View>
        );
      case "multiplication":
        return (
          <Text>
            {renderParentheses(node.left)}{" "}
            <Text>×</Text>{" "}
            {renderParentheses(node.right)}
          </Text>
        );
      case "addition":
        return (
          <Text>
            {renderParentheses(node.left)}{" "}
            <Text>+</Text>{" "}
            {renderParentheses(node.right)}
          </Text>
        );
      case "subtraction":
        return (
          <Text>
            {renderParentheses(node.left)}{" "}
            <Text>-</Text>{" "}
            {renderParentheses(node.right)}
          </Text>
        );
      case "power":
        return (
          <Text>
            {renderParentheses(node.base)}
            <Text style={{ verticalAlign: "super", fontSize: "0.75em" }}>
              {renderParentheses(node.exponent)}
            </Text>
          </Text>
        );
      default:
        return null;
    }
  };

  const renderParentheses = (node: FormulaNode): React.ReactNode => {
    if (node.type === "value") {
      return renderFormula(node);
    }
    return (
      <Text style={{ display: "inline-flex", alignItems: "center" }}>
        <Text style={{ fontSize: "2rem", marginRight: "0.25rem" }}>(</Text>
        {renderFormula(node)}
        <Text style={{ fontSize: "2rem", marginLeft: "0.25rem" }}>)</Text>
      </Text>
    );
  };

  // Actually run the formula calculation
  const result = calculateFormula(formula);

  return (
    <Card style={{ padding: "1.5rem" }}>
      <View style={{ flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <Text style={{ fontSize: "1.125rem", fontWeight: 600 }}>Formula:</Text>
        <Text style={{ fontSize: "2rem" }}>{renderFormula(formula)}</Text>
        <Text style={{ fontSize: "1.125rem", fontWeight: 600 }}>Result:</Text>
        <Text style={{ fontSize: "3rem", fontWeight: "bold" }}>{result}</Text>
      </View>
    </Card>
  );
}
