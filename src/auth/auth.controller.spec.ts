import { HttpStatus, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';

jest.mock('./auth.service');
jest.mock('@nestjs/config');

const frontend = 'http://front.end';
const success = '/login/success';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Controller', () => {
  let authController: AuthController;
  let authService;
  let configService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService, ConfigService],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('POST /auth/signup', () => {
    it('should call authService.signUpWithPassword and add jwt to session', async () => {
      const mockUser = {
        id: 1,
        username: 'TestUser',
        email: 'test@test.com',
        password: 'TestPassword',
      };
      authService.signUpWithPassword.mockResolvedValueOnce(mockUser);
      const mockReq: any = {
        session: {},
      };
      const signUpDto: SignUpDto = {
        username: mockUser.username,
        email: mockUser.email,
        password: mockUser.password,
      };

      const result = await authController.signUp(mockReq, signUpDto);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith({
        ...mockReq,
        user: mockUser,
      });
      expect(authService.signUpWithPassword).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('POST /auth/signin', () => {
    it('should call authService.generateJwtToken and return a token', async () => {
      authService.generateJwtToken.mockReturnValueOnce({
        accessToken: 'mock.jwt',
      });
      const req: any = {
        user: {
          id: 1,
          username: 'TestUser',
          email: 'test@test.com',
        },
        session: {},
      };

      const result = authController.signIn(req);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith(req);
      expect(req.session).toMatchInlineSnapshot(`Object {}`);
      expect(result).toBeUndefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should set session to null', async () => {
      configService.get.mockReturnValueOnce(frontend);
      const req: any = {
        session: {
          Id: 'mockUuid',
        },
        res: { redirect: jest.fn() },
      };

      const result = authController.logOut(req);

      expect(req.session).toBeNull();
      expect(result).toBeUndefined();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should call authService.forgotPassword', async () => {
      const mockForgotPassDto: ForgotPasswordDto = {
        username: 'mockuser',
      };

      await authController.forgotPassword(mockForgotPassDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        mockForgotPassDto,
      );
      expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/reset-password/', () => {
    it('should call authService.resetPasswordVerify and return true on valid code', async () => {
      authService.resetPassword.mockResolvedValueOnce(true);
      const mockResetPasswordDto: ResetPasswordDto = {
        code: 'mock code',
        newPassword: 'newP@ssword1',
      };

      await authController.resetPassword(mockResetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        mockResetPasswordDto,
      );
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/reset-password/', () => {
    it('should call authService.resetPassword and throw Unauthorized on invalid code', async () => {
      authService.resetPassword.mockImplementation(() => {
        throw new NotFoundException();
      });
      const mockResetPasswordDto: ResetPasswordDto = {
        code: 'mock code',
        newPassword: 'newP@ssword1',
      };

      const error = await authController
        .resetPassword(mockResetPasswordDto)
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(authService.resetPassword).toHaveBeenCalledWith(
        mockResetPasswordDto,
      );
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /auth/protected', () => {
    it('should return string', () => {
      const result = authController.getProtected();

      expect(result).toMatchInlineSnapshot(`"JWT is working"`);
    });
  });

  describe('GET /auth/google', () => {
    it('should return void', () => {
      const result = authController.googleLogin();

      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should call authService.addJwtToCookie and redirect', async () => {
      // authService.addJwtToCookie.mockReturnValueOnce();
      configService.get
        .mockReturnValueOnce(frontend)
        .mockReturnValueOnce(success);
      const req: any = {
        query: { code: 'FAKE_CODE' },
        user: {
          id: 1,
          username: 'TestUser',
          email: 'test@test.com',
        },
        session: {},
        res: { setHeader: jest.fn(), redirect: jest.fn() },
      };

      const result = await authController.googleLoginCallback(req);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith(req);
      expect(req.res.redirect).toHaveBeenCalledWith(
        HttpStatus.TEMPORARY_REDIRECT,
        `${frontend}${success}`,
      );
      expect(req.res.redirect).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/facebook', () => {
    it('should return void', () => {
      const result = authController.facebookLogin();

      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/facebook/callback', () => {
    it('should call authService.addJwtToCookie and redirect', async () => {
      // authService.addJwtToCookie.mockReturnValueOnce();
      configService.get
        .mockReturnValueOnce(frontend)
        .mockReturnValueOnce(success);
      const req: any = {
        query: { code: 'FAKE_CODE' },
        user: {
          id: 1,
          username: 'TestUser',
          email: 'test@test.com',
        },
        session: {},
        res: { setHeader: jest.fn(), redirect: jest.fn() },
      };

      const result = await authController.facebookLoginCallback(req);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith(req);
      expect(req.res.redirect).toHaveBeenCalledWith(
        HttpStatus.TEMPORARY_REDIRECT,
        `${frontend}${success}`,
      );
      expect(req.res.redirect).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/github', () => {
    it('should return void', () => {
      const result = authController.githubLogin();

      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/github/callback', () => {
    it('should call authService.addJwtToCookie and redirect', async () => {
      // authService.addJwtToCookie.mockReturnValueOnce();
      configService.get
        .mockReturnValueOnce(frontend)
        .mockReturnValueOnce(success);
      const req: any = {
        query: { code: 'FAKE_CODE' },
        user: {
          id: 1,
          username: 'TestUser',
          email: 'test@test.com',
        },
        session: {},
        res: { setHeader: jest.fn(), redirect: jest.fn() },
      };

      const result = await authController.githubLoginCallback(req);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith(req);
      expect(req.res.redirect).toHaveBeenCalledWith(
        HttpStatus.TEMPORARY_REDIRECT,
        `${frontend}${success}`,
      );
      expect(req.res.redirect).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/twitter', () => {
    it('should return void', () => {
      const result = authController.twitterLogin();

      expect(result).toBeUndefined();
    });
  });

  describe('GET /auth/twitter/callback', () => {
    it('should call authService.addJwtToCookie then redirect', async () => {
      // authService.addJwtToCookie.mockReturnValueOnce();
      configService.get
        .mockReturnValueOnce(frontend)
        .mockReturnValueOnce(success);
      const req: any = {
        query: { code: 'FAKE_CODE' },
        user: {
          id: 1,
          username: 'TestUser',
          email: 'test@test.com',
        },
        session: {},
        res: { setHeader: jest.fn(), redirect: jest.fn() },
      };

      const result = await authController.twitterLoginCallback(req);

      expect(authService.addJwtToCookie).toHaveBeenCalledWith(req);
      expect(req.res.redirect).toHaveBeenCalledWith(
        HttpStatus.TEMPORARY_REDIRECT,
        `${frontend}${success}`,
      );
      expect(req.res.redirect).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });
});
