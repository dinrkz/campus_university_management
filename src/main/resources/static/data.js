(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.CampusData = api;
}(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    const schemas = {
        universities: [
            { key: "id", label: "ID", type: "number" },
            { key: "name", label: "University", type: "text" },
            { key: "location", label: "City", type: "text" },
            { key: "education_direction", label: "Education direction", type: "text" },
            { key: "creation_year", label: "Founded", type: "number" },
            { key: "course", label: "Course", type: "text" }
        ],
        professors: [
            { key: "id", label: "ID", type: "number" },
            { key: "name", label: "Professor", type: "text" },
            { key: "age", label: "Age", type: "number" },
            { key: "department", label: "Department", type: "text" },
            { key: "experience", label: "Experience", type: "number" },
            { key: "knowledge", label: "Expertise", type: "text" },
            { key: "personal_qualities", label: "Personal qualities", type: "text" },
            { key: "city", label: "City", type: "text" }
        ]
    };

    // Fictional records for the portfolio preview; these are not real institutions or people.
    const universitySeeds = [
        ["Demo Astana Data Institute", "Astana", "Data Engineering", 2008, "Data pipelines"],
        ["Demo Almaty Analytics College", "Almaty", "Data Analytics", 2001, "Business intelligence"],
        ["Demo Karaganda Technical Campus", "Karaganda", "Computer Science", 1997, "Database systems"],
        ["Demo Shymkent Digital Institute", "Shymkent", "Data Engineering", 2014, "Distributed computing"],
        ["Demo Aktobe Applied College", "Aktobe", "Data Analytics", 2006, "Applied statistics"],
        ["Demo Astana Research Campus", "Astana", "Computer Science", 1995, "Algorithms"],
        ["Demo Almaty Business Institute", "Almaty", "Business Informatics", 2003, "Product analytics"],
        ["Demo Karaganda Data College", "Karaganda", "Data Engineering", 2010, "Data warehousing"],
        ["Demo Shymkent Analytics Campus", "Shymkent", "Data Analytics", 2016, "Data visualization"],
        ["Demo Aktobe Digital Institute", "Aktobe", "Computer Science", 2012, "Software engineering"],
        ["Demo Astana Applied Institute", "Astana", "Business Informatics", 2009, "Decision support"],
        ["Demo Almaty Systems Campus", "Almaty", "Data Engineering", 1999, "Cloud data platforms"],
        ["Demo Karaganda Research Institute", "Karaganda", "Data Analytics", 2005, null],
        ["Demo Shymkent Business College", "Shymkent", "Business Informatics", 2007, "Operations analytics"],
        ["Demo Aktobe Research Campus", "Aktobe", "Data Engineering", 2018, "Streaming data"],
        ["Demo Astana Analytics College", "Astana", "Data Analytics", null, "Statistical modeling"],
        ["Demo Almaty Digital College", "Almaty", "Computer Science", 2011, "Information systems"],
        ["Demo Karaganda Applied Campus", "Karaganda", "Business Informatics", 2015, ""]
    ];
    const cities = ["Astana", "Almaty", "Karaganda", "Shymkent", "Aktobe"];
    const departments = ["Data Engineering", "Data Analytics", "Computer Science", "Business Informatics"];
    const expertise = ["SQL, Python, ETL", "Statistics, Power BI", "Java, databases", "Excel, business intelligence", "Spark, data modeling", "Python, visualization", "Algorithms, systems", "SQL, product analytics"];
    const qualities = ["Analytical thinking", "Clear communication", "Attention to detail", "Teamwork"];
    const demo = {
        universities: universitySeeds.map(function (values, index) {
            const row = { id: index + 1 };
            schemas.universities.slice(1).forEach(function (column, fieldIndex) {
                row[column.key] = values[fieldIndex];
            });
            return row;
        }),
        professors: Array.from({ length: 32 }, function (_, index) {
            const age = 29 + (index * 7) % 32;
            return {
                id: index + 1,
                name: "Demo Researcher " + String(index + 1).padStart(2, "0"),
                age: age,
                department: departments[index % departments.length],
                experience: Math.min(age - 23, 3 + (index * 3) % 24),
                knowledge: index === 10 ? null : expertise[index % expertise.length],
                personal_qualities: index === 7 || index === 23 ? "" : qualities[index % qualities.length],
                city: index === 28 ? null : cities[index % cities.length]
            };
        })
    };

    function isMissing(value) {
        return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
    }

    function normalized(value) {
        return isMissing(value) ? "" : String(value).trim().toLocaleLowerCase();
    }

    function numberIssue(row, column) {
        const value = row[column.key];
        if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
            return "Expected a whole number";
        }
        if (column.key === "id" && value < 1) return "ID must be a positive integer";
        if (column.key === "age" && (value < 18 || value > 100)) return "Age must be between 18 and 100";
        if (column.key === "experience") {
            if (value < 0) return "Experience cannot be negative";
            if (Number.isInteger(row.age) && row.age >= 18 && row.age <= 100 && value > row.age - 18) {
                return "Experience exceeds years since age 18";
            }
        }
        if (column.key === "creation_year" && (value < 1000 || value > new Date().getFullYear())) {
            return "Founded year must be between 1000 and the current year";
        }
        return null;
    }

    // Completeness includes every provided column, including ID. Empty datasets have no percentage.
    function profile(rows, columns) {
        const totalCells = rows.length * columns.length;
        const issues = [];
        const ids = new Set();
        let missingCells = 0;
        let duplicateIds = 0;
        rows.forEach(function (row, rowIndex) {
            columns.forEach(function (column) {
                let message = null;
                if (isMissing(row[column.key])) {
                    missingCells += 1;
                    message = "Missing value";
                } else if (column.type === "number") {
                    message = numberIssue(row, column);
                }
                if (message) issues.push({ rowIndex: rowIndex, id: row.id ?? null, field: column.key, label: column.label, message: message });
            });
            if (!isMissing(row.id)) {
                const identity = String(row.id).trim();
                if (ids.has(identity)) {
                    duplicateIds += 1;
                    issues.push({ rowIndex: rowIndex, id: row.id, field: "id", label: "ID", message: "Duplicate ID" });
                }
                ids.add(identity);
            }
        });
        const filledCells = totalCells - missingCells;
        return {
            totalCells: totalCells,
            filledCells: filledCells,
            missingCells: missingCells,
            completeness: totalCells ? Math.round(filledCells / totalCells * 1000) / 10 : null,
            duplicateIds: duplicateIds,
            issues: issues
        };
    }

    function filterRows(rows, columns, options) {
        const settings = Object.assign({ query: "", location: "", category: "", sortKey: "id", sortDirection: "asc" }, options);
        const query = normalized(settings.query);
        const location = normalized(settings.location);
        const category = normalized(settings.category);
        const locationKey = columns.some(function (column) { return column.key === "location"; }) ? "location" : "city";
        const categoryKey = columns.some(function (column) { return column.key === "education_direction"; }) ? "education_direction" : "department";
        const sortedColumn = columns.find(function (column) { return column.key === settings.sortKey; });
        const direction = settings.sortDirection === "desc" ? -1 : 1;
        return rows.filter(function (row) {
            return (!query || columns.some(function (column) { return normalized(row[column.key]).includes(query); }))
                && (!location || normalized(row[locationKey]) === location)
                && (!category || normalized(row[categoryKey]) === category);
        }).sort(function (first, second) {
            const a = first[settings.sortKey];
            const b = second[settings.sortKey];
            const missingA = isMissing(a);
            const missingB = isMissing(b);
            if (missingA || missingB) return missingA === missingB ? 0 : (missingA ? 1 : -1);
            if (sortedColumn && sortedColumn.type === "number" && typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
                return (a - b) * direction;
            }
            return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * direction;
        });
    }

    function groupCounts(rows, key) {
        const counts = new Map();
        rows.forEach(function (row) {
            if (isMissing(row[key])) return;
            const label = String(row[key]).trim();
            counts.set(label, (counts.get(label) || 0) + 1);
        });
        return Array.from(counts, function (entry) { return { label: entry[0], count: entry[1] }; })
            .sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label, undefined, { numeric: true }); });
    }

    function csvCell(value) {
        if (value === null || value === undefined) return "";
        let text = String(value);
        // Prevent a spreadsheet from executing untrusted string cells as formulas.
        if (typeof value === "string" && /^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
        return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }

    function toCsv(rows, columns) {
        return [columns.map(function (column) { return csvCell(column.key); }).join(",")]
            .concat(rows.map(function (row) {
                return columns.map(function (column) { return csvCell(row[column.key]); }).join(",");
            })).join("\r\n");
    }

    return { schemas: schemas, demo: demo, isMissing: isMissing, profile: profile, filterRows: filterRows, groupCounts: groupCounts, toCsv: toCsv };
}));
