"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const data = require("../../main/resources/static/data.js");

test("the module also loads directly in a browser without CommonJS", function () {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve("../../main/resources/static/data.js"), "utf8"), context);
    assert.equal(typeof context.window.CampusData.filterRows, "function");
    assert.equal(context.window.CampusData.demo.universities.length, 18);
    assert.equal(context.window.CampusData.demo.professors.length, 32);
});

test("missing values distinguish whitespace from zero and false", function () {
    [null, undefined, "", " \t\n "].forEach(function (value) { assert.equal(data.isMissing(value), true); });
    [0, false, "0", " SQL "].forEach(function (value) { assert.equal(data.isMissing(value), false); });
});

test("filters combine Cyrillic search with university city and category without mutating input", function () {
    const rows = [
        { id: 2, name: "Аналитика данных", location: "Алматы", education_direction: "Data Analytics", course: null },
        { id: 1, name: "Инженерия данных", location: "Астана", education_direction: "Data Engineering", course: "SQL" },
        { id: 3, name: null, location: "Алматы", education_direction: "Data Analytics", course: "SQL" }
    ];
    const original = structuredClone(rows);
    const result = data.filterRows(rows, data.schemas.universities, { query: " ДАННЫХ ", location: "алматы", category: "DATA ANALYTICS" });
    assert.deepEqual(result.map(function (row) { return row.id; }), [2]);
    assert.deepEqual(rows, original);
    assert.deepEqual(data.filterRows(rows, data.schemas.universities, { query: "sql" }).map(function (row) { return row.id; }), [1, 3]);
});

test("professor filters map city and department and safely search missing fields", function () {
    const rows = [
        { id: 1, name: "First", city: "Astana", department: "Data Engineering", knowledge: null },
        { id: 2, name: "Second", city: "Almaty", department: "Data Analytics", knowledge: "Python" },
        { id: 3, name: "Third", city: null, department: "Data Analytics", knowledge: "Python" }
    ];
    assert.deepEqual(data.filterRows(rows, data.schemas.professors, { query: "python", location: "Almaty", category: "Data Analytics" }).map(function (row) { return row.id; }), [2]);
    assert.equal(data.filterRows(rows, data.schemas.professors, { query: "null" }).length, 0);
});

test("sorting orders numerical values and leaves missing values last in both directions", function () {
    const rows = [{ id: null }, { id: 10 }, { id: 2 }, { id: " " }];
    assert.deepEqual(data.filterRows(rows, data.schemas.universities).map(function (row) { return row.id; }), [2, 10, null, " "]);
    assert.deepEqual(data.filterRows(rows, data.schemas.universities, { sortDirection: "desc" }).map(function (row) { return row.id; }), [10, 2, null, " "]);
    const names = [{ name: "Dataset 10" }, { name: "Dataset 2" }, { name: null }];
    assert.deepEqual(data.filterRows(names, data.schemas.universities, { sortKey: "name" }).map(function (row) { return row.name; }), ["Dataset 2", "Dataset 10", null]);
});

test("profile measures all cells and reports an undefined percentage for an empty dataset", function () {
    assert.deepEqual(data.profile([], data.schemas.universities), { totalCells: 0, filledCells: 0, missingCells: 0, completeness: null, duplicateIds: 0, issues: [] });
    const columns = [{ key: "id", label: "ID", type: "number" }, { key: "name", label: "Name", type: "text" }, { key: "course", label: "Course", type: "text" }];
    const result = data.profile([{ id: 1, name: "Sample", course: null }, { id: 2, name: " ", course: "SQL" }], columns);
    assert.equal(result.totalCells, 6);
    assert.equal(result.filledCells, 4);
    assert.equal(result.missingCells, 2);
    assert.equal(result.completeness, 66.7);
    assert.deepEqual(result.issues[0], { rowIndex: 0, id: 1, field: "course", label: "Course", message: "Missing value" });
    assert.equal(data.profile([{ id: null }], [columns[0]]).completeness, 0);
});

test("profile counts excess duplicate IDs and validates numerical types and ranges", function () {
    const rows = [
        { id: 1, age: 17, experience: -1 },
        { id: 1, age: 25, experience: 8 },
        { id: 1, age: "42", experience: 2.5 },
        { id: 0, age: 101, experience: Infinity }
    ];
    const columns = data.schemas.professors.filter(function (column) { return ["id", "age", "experience"].includes(column.key); });
    const result = data.profile(rows, columns);
    assert.equal(result.duplicateIds, 2);
    assert.equal(result.completeness, 100);
    assert.equal(result.issues.filter(function (issue) { return issue.message === "Duplicate ID"; }).length, 2);
    assert.ok(result.issues.some(function (issue) { return issue.rowIndex === 1 && issue.field === "experience"; }));
    assert.ok(result.issues.some(function (issue) { return issue.rowIndex === 2 && issue.field === "age"; }));
    assert.ok(result.issues.some(function (issue) { return issue.rowIndex === 3 && issue.field === "id"; }));
    assert.equal(result.issues.length, 10);
    const yearColumn = data.schemas.universities.filter(function (column) { return column.key === "creation_year"; });
    assert.equal(data.profile([{ creation_year: 999 }, { creation_year: new Date().getFullYear() + 1 }], yearColumn).issues.length, 2);
    assert.equal(data.profile([{ creation_year: new Date().getFullYear() }], yearColumn).issues.length, 0);
});

test("groups exclude missing values and sort by count then label", function () {
    const rows = [{ city: "Astana" }, { city: "Almaty" }, { city: "Astana" }, { city: "Karaganda" }, { city: null }, { city: " " }];
    assert.deepEqual(data.groupCounts(rows, "city"), [{ label: "Astana", count: 2 }, { label: "Almaty", count: 1 }, { label: "Karaganda", count: 1 }]);
});

test("CSV exports keys in column order and escapes commas, quotes and multiline text", function () {
    const columns = [{ key: "id" }, { key: "name" }, { key: "note" }];
    const rows = [{ id: 1, name: 'Sample, "quoted"', note: "Line one\nLine two" }, { id: 2, name: null, note: "plain" }];
    assert.equal(data.toCsv(rows, columns), 'id,name,note\r\n1,"Sample, ""quoted""","Line one\nLine two"\r\n2,,plain');
    assert.equal(data.toCsv([], columns), "id,name,note");
});

test("CSV neutralizes formula-like strings while preserving numerical negatives", function () {
    const columns = [{ key: "value" }];
    ["=SUM(1)", "+1", "-10", "@command", "  =SUM(1)", "\tcommand", "\rcommand"].forEach(function (value) {
        const csv = data.toCsv([{ value: value }], columns);
        assert.ok(csv.split("\r\n")[1].startsWith(value.includes("\r") ? '"\'' : "'"), "Unsafe formula string: " + JSON.stringify(value));
    });
    assert.equal(data.toCsv([{ value: -10 }, { value: 0 }], columns), "value\r\n-10\r\n0");
});

test("demo records expose deliberate missing values without invalid numbers or duplicate IDs", function () {
    Object.keys(data.schemas).forEach(function (dataset) {
        const result = data.profile(data.demo[dataset], data.schemas[dataset]);
        assert.ok(result.missingCells > 0);
        assert.ok(result.completeness > 90 && result.completeness < 100);
        assert.equal(result.duplicateIds, 0);
        assert.ok(result.issues.every(function (issue) { return issue.message === "Missing value"; }));
    });
});
