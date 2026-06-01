import { All, Controller, Req, Res } from '@nestjs/common';
import { Role } from '@consultorio/shared';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @Public()
  @All('auth/login')
  login(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('auth', req, res, '/auth/login');
  }

  @All('auth/me')
  me(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('auth', req, res, '/auth/me');
  }

  @Roles(Role.ADMIN)
  @All('auth/users')
  authUsers(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('auth', req, res, '/auth/users');
  }

  @Roles(Role.ADMIN, Role.RECEPCION)
  @All('employees')
  employeesRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('employees', req, res, '/employees');
  }

  @Roles(Role.ADMIN, Role.RECEPCION)
  @All('employees/*')
  employees(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('employees', req, res, `/${sub}`);
  }

  @All('branches')
  branchesRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('employees', req, res, '/branches');
  }

  @All('branches/*')
  branches(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('employees', req, res, `/${sub}`);
  }

  @Roles(Role.ADMIN, Role.RECEPCION)
  @All('patients')
  patientsRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('patients', req, res, '/patients');
  }

  @Roles(Role.ADMIN, Role.RECEPCION, Role.PROFESIONAL)
  @All('patients/*')
  patients(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('patients', req, res, `/${sub}`);
  }

  @Roles(Role.ADMIN, Role.RECEPCION)
  @All('appointments')
  appointmentsRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('appointments', req, res, '/appointments');
  }

  @Roles(Role.ADMIN, Role.RECEPCION, Role.PROFESIONAL)
  @All('appointments/*')
  appointments(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('appointments', req, res, `/${sub}`);
  }

  @All('notifications')
  notificationsRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('appointments', req, res, '/notifications');
  }

  @All('notifications/*')
  notifications(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('appointments', req, res, `/${sub}`);
  }

  @Roles(Role.ADMIN)
  @All('professionals')
  professionalsRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('professionals', req, res, '/professionals');
  }

  @Roles(Role.ADMIN, Role.RECEPCION, Role.PROFESIONAL)
  @All('professionals/*')
  professionals(@Req() req: Request, @Res() res: Response) {
    const sub = req.path.replace(/^\/api\/v1\/?/, '');
    return this.proxy.forward('professionals', req, res, `/${sub}`);
  }

  @All('specialties')
  specialties(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('professionals', req, res, '/specialties');
  }

  @Roles(Role.ADMIN, Role.RECEPCION)
  @All('availability')
  availability(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('professionals', req, res, '/availability');
  }
}
