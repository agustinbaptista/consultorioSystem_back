import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

export type ServiceKey =
  | 'auth'
  | 'employees'
  | 'patients'
  | 'appointments'
  | 'professionals';

@Injectable()
export class ProxyService {
  private readonly urls: Record<ServiceKey, string>;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.urls = {
      auth: config.get('AUTH_SERVICE_URL', 'http://localhost:3001'),
      employees: config.get('EMPLOYEES_SERVICE_URL', 'http://localhost:3002'),
      patients: config.get('PATIENTS_SERVICE_URL', 'http://localhost:3003'),
      appointments: config.get('APPOINTMENTS_SERVICE_URL', 'http://localhost:3004'),
      professionals: config.get('PROFESSIONALS_SERVICE_URL', 'http://localhost:8000'),
    };
  }

  async forward(
    service: ServiceKey,
    req: Request,
    res: Response,
    pathOverride?: string,
  ): Promise<void> {
    // Short-circuit CORS preflight and respond with explicit CORS headers.
    // We avoid forwarding OPTIONS to microservices because they don't handle CORS.
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        String(
          req.headers['access-control-request-headers'] ??
            'Content-Type,Authorization,x-api-key',
        ),
      );
      res.status(204).send();
      return;
    }

    const base = this.urls[service];
    const path = pathOverride ?? (req.path.replace(/^\/api\/v1/, '') || '/');
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {};
    if (req.headers['x-user-id']) headers['x-user-id'] = String(req.headers['x-user-id']);
    if (req.headers['x-user-role']) headers['x-user-role'] = String(req.headers['x-user-role']);
    if (req.headers.authorization) headers['authorization'] = String(req.headers.authorization);

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.http.request({
          method: req.method,
          url,
          data: req.body,
          params: req.query,
          headers,
          validateStatus: () => true,
        }),
      );
      res.status(response.status).json(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Proxy error';
      res.status(502).json({
        statusCode: 502,
        message: `Error de comunicación con ${service}: ${message}`,
      });
    }
  }
}
