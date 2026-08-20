"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const analyze_1 = __importDefault(require("./routes/analyze"));
const app = (0, express_1.default)();
// Mount sandbox static path
app.use('/sandbox', express_1.default.static(path_1.default.join(__dirname, '../../extension/public')));
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Routes
app.use('/api', analyze_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Start listening
app.listen(config_1.PORT, () => {
    console.log(`Programming Hero AI Reply Assistant Backend running on http://localhost:${config_1.PORT}`);
});
exports.default = app;
