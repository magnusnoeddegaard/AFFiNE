import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/**
 * Setup OpenTelemetry for the application
 */
export async function setupOpenTelemetry() {
  // Skip if not in production or explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_TELEMETRY !== 'true') {
    console.log('OpenTelemetry is disabled in development. Set ENABLE_TELEMETRY=true to enable.');
    return;
  }

  const metricsPort = parseInt(process.env.METRICS_PORT || '9464', 10);
  const prometheusExporter = new PrometheusExporter({
    port: metricsPort,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'affine-server',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    metricReader: prometheusExporter,
    contextManager: new AsyncLocalStorageContextManager(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-graphql': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
      }),
    ],
  });

  // Initialize the SDK
  await sdk.start();

  // Handle shutdown gracefully
  const shutdownHandler = async () => {
    await sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error));
    process.exit(0);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  console.log('OpenTelemetry initialized successfully');
  console.log(`Prometheus metrics available at http://localhost:${metricsPort}/metrics`);
}