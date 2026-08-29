#!/bin/bash
cat << 'EOF2' > check_timing.patch
<<<<<<< SEARCH
      // Internal secret check
      const internalSecret = process.env['INTERNAL_SERVICE_SECRET'] || '';
      const headerVal = req.headers['x-internal-secret'];
      const clientSecret = Array.isArray(headerVal) ? headerVal[0] : (headerVal || '');
      if (!internalSecret || clientSecret !== internalSecret) {
        return reply.status(403).send(fail(new GatewayError('FORBIDDEN', 'Invalid internal secret', 403)));
      }
=======
      // Internal secret check
      const internalSecret = process.env['INTERNAL_SERVICE_SECRET'] || '';
      const headerVal = req.headers['x-internal-secret'];
      const clientSecret = Array.isArray(headerVal) ? headerVal[0] : (headerVal || '');

      const internalSecretBuf = Buffer.from(internalSecret, 'utf8');
      const clientSecretBuf = Buffer.from(clientSecret, 'utf8');

      if (
        internalSecretBuf.length === 0 ||
        clientSecretBuf.length !== internalSecretBuf.length ||
        !timingSafeEqual(clientSecretBuf, internalSecretBuf)
      ) {
        return reply.status(403).send(fail(new GatewayError('FORBIDDEN', 'Invalid internal secret', 403)));
      }
>>>>>>> REPLACE
EOF2
