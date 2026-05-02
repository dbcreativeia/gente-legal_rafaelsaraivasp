const str = "13/05/2026 10:30:00";
const parsed = new Date(str);
console.log("Is NaN?", isNaN(parsed.getTime()));
