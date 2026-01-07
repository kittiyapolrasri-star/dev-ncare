import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import 'express-async-errors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import branchRoutes from './routes/branches.js';
import productRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import supplierRoutes from './routes/suppliers.js';
import oemRoutes from './routes/oem.js';
import customerRoutes from './routes/customers.js';
import distributorRoutes from './routes/distributors.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import returnRoutes from './routes/returns.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { sanitizeBody } from './middleware/validation.js';
import { requestLogger } from './middleware/auditLog.js';

const app = express();
const httpServer = createServer(app);
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');

const io = new SocketServer(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeBody);

// General rate limiting
app.use('/api', rateLimiter('general'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/branches', branchRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/oem', oemRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/distributors', distributorRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/returns', returnRoutes);

app.use('/api', apiRouter);

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-branch', (branchId: string) => {
        socket.join(`branch-${branchId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Export io for use in other modules
export { io };

// Error handler
app.use(errorHandler);

const PORT = process.env.API_PORT || 4000;

httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║         🏥 PharmaCare ERP API Server                     ║
╠══════════════════════════════════════════════════════════╣
║  Status:    Running                                      ║
║  Port:      ${PORT}                                          ║
║  Env:       ${process.env.NODE_ENV || 'development'}                                ║
║  Time:      ${new Date().toLocaleString('th-TH')}               ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
