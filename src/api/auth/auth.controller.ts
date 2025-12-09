import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Get,
  Req,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../home-management/entities/dtos/user.dto';
import { formatResponse } from '../../common/utils/utils.api';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalApiKeyGuard } from './guards/global-api-key.guard';
import { Request } from 'express';
import {
  SuccessCodes,
  ErrorCodes,
} from '../entities/enums/response-codes.enum';
import { AuthMessages } from './entities/enums/auth.enum';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

@Controller('auth')
@ApiTags('Auth')
@UseGuards(new GlobalApiKeyGuard())
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger,
  ) {}

  @Post('status')
  async status() {
    return this.authService.status();
  }

  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiBody({
    type: CreateUserDto,
    description: 'User credentials',
    required: true,
  })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'User logged in successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async login(@Body() loginDto: CreateUserDto) {
    console.log('Login DTO:', loginDto); // Log the login DTO for debugging
    const response = await this.authService.login(loginDto);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidCredentials);
    }
    const formattedResponse = formatResponse(response);
    console.log('Formatted Response:', formattedResponse); // Log the formatted response for debugging
    return formattedResponse;
  }

  @Post('signup')
  @ApiOperation({ summary: 'Signup' })
  @ApiBody({
    type: CreateUserDto,
    description: 'User credentials',
    required: true,
  })
  @ApiResponse({
    status: SuccessCodes.Created,
    description: 'User signed up successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async signup(@Body() signupDto: CreateUserDto) {
    const response = await this.authService.signup(signupDto);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidCredentials);
    }
    const formattedResponse = formatResponse(response);
    return formattedResponse;
  }

  @Get('me')
  @ApiOperation({ summary: 'Validate token' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'Token validated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async validate(@Req() req: Request) {
    const token = await this.authService.getTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }
    const response = await this.authService.validateToken(token);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.UserNotFound);
    }
    const formattedResponse = formatResponse(user);
    return formattedResponse;
  }

  @Post('biometrics/options')
  @ApiOperation({ summary: 'Generate WebAuthn registration options' })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'WebAuthn registration options generated successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async generateRegistrationOptions(@Req() req: Request) {
    const token = await this.authService.getTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }
    const response = await this.authService.validateToken(token);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.UserNotFound);
    }
    const options = await this.authService.generateRegistrationOptions(user);
    return formatResponse(options);
  }

  @Post('biometrics/register')
  @ApiOperation({ summary: 'Register WebAuthn credential' })
  @ApiBody({
    type: Object,
    description: 'WebAuthn attestation object',
    required: true,
  })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'WebAuthn credential registered successfully',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async verifyAndStoreRegistration(
    @Req() req: Request,
    @Body() attestation: RegistrationResponseJSON,
  ) {
    const token = await this.authService.getTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }
    const response = await this.authService.validateToken(token);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.UserNotFound);
    }
    const credential = await this.authService.verifyAndStoreRegistration(
      user,
      attestation,
    );
    return formatResponse(credential);
  }

  @Post('biometrics/authenticate')
  @ApiOperation({ summary: 'Verify WebAuthn authentication assertion' })
  @ApiBody({
    type: Object,
    description: 'WebAuthn attestation object',
    required: true,
  })
  @ApiResponse({
    status: SuccessCodes.Ok,
    description: 'WebAuthn authentication successful',
  })
  @ApiResponse({ status: ErrorCodes.BadRequest, description: 'Bad Request' })
  @ApiResponse({ status: ErrorCodes.Unauthorized, description: 'Unauthorized' })
  @ApiResponse({ status: ErrorCodes.Forbidden, description: 'Forbidden' })
  @ApiResponse({ status: ErrorCodes.NotFound, description: 'Not Found' })
  @ApiResponse({
    status: ErrorCodes.InternalServerError,
    description: 'Internal Server Error',
  })
  async verifyAuthenticationAssertion(
    @Req() req: Request,
    @Body() attestation: AuthenticationResponseJSON,
  ) {
    const token = await this.authService.getTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }
    const response = await this.authService.validateToken(token);
    if (!response) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.UserNotFound);
    }
    const credential = await this.authService.verifyAuthenticationAssertion(
      user,
      attestation,
    );
    return formatResponse(credential);
  }
}
