export function generateTestCases(
  configurableFormats: string[],
  inputFormats: Array<{
    name: string;
    tests: Array<{ places: number; input: string; expected: number }>;
  }>,
) {
  let cases = [];

  for (let configurableFormat of configurableFormats) {
    for (let inputFormat of inputFormats) {
      for (let test of inputFormat.tests) {
        cases.push([
          configurableFormat,
          inputFormat.name,
          test.places,
          test.input,
          test.expected,
        ]);
      }
    }
  }

  return cases;
}
