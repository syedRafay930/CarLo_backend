import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AllocationService } from 'src/Allocation/allocation.service';
import { AnalyticsService } from 'src/Analytics/analytics.service';
import { ChatbotService } from 'src/Chatbot/chatbot.service';
import { ClientAuthService } from 'src/Client/Auth/auth.service';
import { ClientJwtBlacklistGuard } from 'src/Client/Auth/guards/jwt.guard';
import { CreateBookingDto } from 'src/Client/Booking/dto/create_booking.dto';
import { BookingService } from 'src/Client/Booking/booking.service';
import { BecomeHostDto } from 'src/Client/Host/dto/become_host.dto';
import { HostService } from 'src/Client/Host/host.service';
import { ClientNotificationsService } from 'src/Client/client-notifications/client-notifications.service';
import { UpdateProfileDto } from 'src/Client/User/dto/update_profile.dto';
import { ClientUsersService } from 'src/Client/User/user.service';
import { PublicService } from 'src/Client/Public/public.service';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { UserFavoriteVehicles } from 'src/entities/entities/UserFavoriteVehicles';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
import { FirebaseService } from 'src/firebase/firebase.service';
import { CreateVehicleDto } from 'src/FleetManager/Vehicle/dto/create_vehicle.dto';
import { UploadVehicleDocumentsDto } from 'src/FleetManager/Vehicle/dto/upload_vehicle_documents.dto';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';
import { OcrWorkflowService } from 'src/OCR/ocr-workflow.service';
import {
  FlutterFcmTokenDto,
  FlutterChatMessageDto,
  FlutterPaymentDto,
  FlutterRecommendationsDto,
} from './dto/flutter-actions.dto';
import {
  FlutterForgotPasswordDto,
  FlutterLoginDto,
  FlutterRefreshTokenDto,
  FlutterResetPasswordDto,
  FlutterSignUpDto,
} from './dto/flutter-auth.dto';
import {
  FlutterCreateReviewDto,
  FlutterModelsQueryDto,
  FlutterReviewQueryDto,
  FlutterVehicleQueryDto,
} from './dto/flutter-catalog.dto';
import { OptionalClientJwtGuard } from './guards/optional-client-jwt.guard';

type ClientRequest = {
  headers?: { authorization?: string };
  user?: { client_id?: number; client_email?: string };
};

const IMAGE_DOC_TYPES = [
  'image_coverimg',
  'image_exterior_front',
  'image_exterior_left',
  'image_exterior_right',
  'image_exterior_back',
];

@Controller('flutter')
export class FlutterController {
  private readonly logger = new Logger(FlutterController.name);

  constructor(
    private readonly authService: ClientAuthService,
    private readonly vehicleService: VehicleService,
    private readonly publicService: PublicService,
    private readonly usersService: ClientUsersService,
    private readonly analyticsService: AnalyticsService,
    private readonly bookingService: BookingService,
    private readonly notificationsService: ClientNotificationsService,
    private readonly chatbotService: ChatbotService,
    private readonly allocationService: AllocationService,
    private readonly firebaseService: FirebaseService,
    private readonly hostService: HostService,
    private readonly ocrWorkflowService: OcrWorkflowService,
    @InjectRepository(UserFavoriteVehicles)
    private readonly favoritesRepo: Repository<UserFavoriteVehicles>,
    @InjectRepository(FleetManagerVehicles)
    private readonly vehiclesRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(VehicleRatings)
    private readonly ratingsRepo: Repository<VehicleRatings>,
  ) {}

  @Post('auth/login')
  async login(@Body() dto: FlutterLoginDto) {
    const user = await this.authService.validateUserByEmail(
      dto.email,
      dto.password,
    );
    return this.authPayload(user);
  }

  @Post('auth/sign-up')
  async signUp(@Body() dto: FlutterSignUpDto) {
    const result = await this.authService.signUp({
      first_name: dto.firstName,
      last_name: dto.lastName,
      email: dto.email,
      password: dto.password,
      contact: dto.contact,
    });
    return this.authPayload(result.user);
  }

  @Post('auth/refresh-token')
  async refreshToken(@Body() dto: FlutterRefreshTokenDto) {
    const refreshed = await this.authService.refreshAccessToken(
      dto.refreshToken,
    );
    return {
      accessToken: refreshed.access_token,
      refreshToken: dto.refreshToken,
    };
  }

  @Post('auth/forgot-password')
  forgotPassword(@Body() dto: FlutterForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Patch('auth/reset-password')
  resetPassword(@Body() dto: FlutterResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('auth/logout')
  async logout(@Req() req: ClientRequest) {
    const token = this.bearerToken(req);
    await this.authService.logout(token);
    return { message: 'Logout successful' };
  }

  @UseGuards(OptionalClientJwtGuard)
  @Get('vehicles')
  async vehicles(@Query() query: FlutterVehicleQueryDto, @Req() req: ClientRequest) {
    const result = await this.vehicleService.getPublicCatalogVehicles(
      query.page ?? 1,
      query.limit ?? 10,
      query.make,
      this.toDriverServiceOption(query.serviceType),
      query.model,
      'DESC',
      query.minPrice,
      query.maxPrice,
      query.vehicleType,
      query.color,
      undefined,
      undefined,
      undefined,
      query.city,
    );

    const favoriteIds = await this.favoriteVehicleIds(
      req.user?.client_id,
      result.data.map((vehicle: any) => vehicle.id),
    );

    return {
      data: result.data.map((vehicle: any) =>
        this.mapVehicleListItem(vehicle, favoriteIds),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @UseGuards(OptionalClientJwtGuard)
  @Get('vehicles/:vehicleId')
  async vehicleDetail(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Req() req: ClientRequest,
  ) {
    const vehicle = await this.vehicleService.getVehicleById(vehicleId);
    const favoriteIds = await this.favoriteVehicleIds(req.user?.client_id, [
      vehicleId,
    ]);
    const raw = await this.vehiclesRepo.findOne({
      where: { id: vehicleId },
      relations: ['fleetManager'],
    });

    return this.mapVehicleDetail(vehicle, raw, favoriteIds.has(vehicleId));
  }

  @Get('vehicles/:vehicleId/reviews')
  async vehicleReviews(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Query() query: FlutterReviewQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const summary = await this.vehicleService.getReviewsByVehicleId(vehicleId);
    const [reviews, total] = await this.ratingsRepo.findAndCount({
      where: { vehicle: { id: vehicleId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: reviews.map((review) => ({
        id: review.id,
        rating: Number(review.rating ?? 0),
        comment: review.comment ?? '',
        createdAt: review.createdAt?.toISOString() ?? '',
        reviewer: {
          firstName: review.user?.firstName ?? '',
          avatarUrl: review.user?.profilePic ?? null,
        },
      })),
      total,
      averageRating: summary.averageRating,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('vehicles/:vehicleId/reviews')
  async createVehicleReview(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() dto: FlutterCreateReviewDto,
    @Req() req: ClientRequest,
  ) {
    const saved = await this.vehicleService.createVehicleReview(
      vehicleId,
      this.clientId(req),
      { rating: dto.rating, review: dto.comment },
    );
    return {
      id: saved.id,
      rating: Number(saved.rating),
      comment: saved.review ?? '',
      createdAt:
        saved.createdAt instanceof Date
          ? saved.createdAt.toISOString()
          : String(saved.createdAt ?? ''),
    };
  }

  @Get('makes')
  makes() {
    return this.vehicleService.getPublicCatalogMakes();
  }

  @Get('brands')
  async brands() {
    const makes = await this.vehicleService.getPublicCatalogMakes();
    return {
      data: makes.data.map((make) => ({
        make,
        logoUrl: null,
      })),
    };
  }

  @Get('models')
  models(@Query() query: FlutterModelsQueryDto) {
    return this.vehicleService.getPublicCatalogModels(query.make);
  }

  @Get('colors')
  colors() {
    return this.vehicleService.getPublicCatalogColors();
  }

  @Get('fleets')
  async fleets() {
    const result = await this.publicService.getPublicFleets({
      page: 1,
      limit: 100,
    });
    return {
      data: result.data.map((fleet: any) => this.mapFleetListItem(fleet)),
    };
  }

  @Get('fleets/:fleetId')
  async fleetDetail(@Param('fleetId', ParseIntPipe) fleetId: number) {
    const fleet = await this.publicService.getPublicFleetDetail(fleetId);
    return {
      ...this.mapFleetListItem(fleet),
      vehicles: (fleet.fleetManagerVehicles ?? []).map((vehicle: any) =>
        this.mapVehicleListItem(vehicle, new Set<number>()),
      ),
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('profile')
  async profile(@Req() req: ClientRequest) {
    const user = await this.currentUser(req);
    const [analytics, hostStatus] = await Promise.all([
      this.analytics(req),
      this.hostService.getHostStatus(this.clientId(req)),
    ]);
    return this.profilePayload(user, analytics, hostStatus.isHost);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Req() req: ClientRequest,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = await this.usersService.updateUserProfile(
      this.clientId(req),
      dto,
      file,
    );
    const [analytics, hostStatus] = await Promise.all([
      this.analytics(req),
      this.hostService.getHostStatus(this.clientId(req)),
    ]);
    return this.profilePayload(user, analytics, hostStatus.isHost);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('profile/favorites/:vehicleId')
  markFavorite(
    @Req() req: ClientRequest,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.usersService.markAsFavorite(this.clientId(req), vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Delete('profile/favorites/:vehicleId')
  unmarkFavorite(
    @Req() req: ClientRequest,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.usersService.unmarkAsFavorite(this.clientId(req), vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('profile/favorites')
  async favoriteVehicles(@Req() req: ClientRequest) {
    const result = await this.usersService.getFavoriteVehicles(
      this.clientId(req),
      1,
      100,
      '',
      'DESC',
    );
    return {
      data: result.data.map((vehicle: any) =>
        this.mapVehicleListItem(vehicle, new Set([vehicle.id])),
      ),
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('bookings')
  async createBooking(
    @Req() req: ClientRequest,
    @Body() dto: CreateBookingDto,
  ) {
    const booking = await this.bookingService.createBooking(
      dto,
      this.clientEmail(req),
    );
    const bookings = await this.bookingService.getClientBookings(
      this.clientId(req),
    );
    return this.mapBooking(
      bookings.find((item: any) => item.id === booking.id) ?? booking,
    );
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('bookings')
  async bookings(@Req() req: ClientRequest) {
    const bookings = await this.bookingService.getClientBookings(
      this.clientId(req),
    );
    return { data: bookings.map((booking: any) => this.mapBooking(booking)) };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('bookings/:bookingId/pay')
  async payBooking(
    @Req() req: ClientRequest,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() dto: FlutterPaymentDto,
  ) {
    const result = await this.bookingService.processInitialPayment(
      this.clientId(req),
      bookingId,
      dto.paymentMethod,
    );
    return {
      message: result.message,
      status: result.transaction.status,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('bookings/:bookingId/slip')
  bookingSlip(
    @Req() req: ClientRequest,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.bookingService.getBookingSlip(bookingId, this.clientId(req));
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('notifications')
  async notifications(@Req() req: ClientRequest) {
    const clientId = this.clientId(req);
    const [list, unread] = await Promise.all([
      this.notificationsService.getClientNotifications(clientId, 1, 100),
      this.notificationsService.getUnreadCount(clientId),
    ]);
    return {
      data: list.data.map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        type: notification.notiType,
      })),
      unreadCount: unread.unreadCount,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Patch('notifications/:id/read')
  readNotification(
    @Req() req: ClientRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(id, this.clientId(req));
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Patch('notifications/read-all')
  readAllNotifications(@Req() req: ClientRequest) {
    return this.notificationsService.markAllAsRead(this.clientId(req));
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('chatbot/message')
  async chatbotMessage(
    @Req() req: ClientRequest,
    @Body() dto: FlutterChatMessageDto,
  ) {
    const reply = await this.chatbotService.chat(
      dto.message,
      this.clientEmail(req),
      dto.history ?? [],
      dto.lat != null && dto.lng != null
        ? { lat: dto.lat, lng: dto.lng }
        : undefined,
    );
    return { reply, timestamp: new Date().toISOString() };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('recommendations')
  async recommendations(
    @Body() dto: FlutterRecommendationsDto,
    @Req() req: ClientRequest,
  ) {
    const pickupDate = new Date();
    const returnDate = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000);
    const result = await this.allocationService.getRecommendations({
      city: 'any',
      vehicleType: dto.vehicleType ?? 'any',
      pickupDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
    });

    const ids = result.recommendations.map(
      (recommendation: { vehicle: { id: number } }) => recommendation.vehicle.id,
    );
    const catalogRows =
      await this.vehicleService.getPublicCatalogListVehiclesByIds(ids);
    const catalogById = new Map<number, any>(
      catalogRows.map((vehicle: { id: number }) => [vehicle.id, vehicle]),
    );

    const favoriteIds = await this.favoriteVehicleIds(
      req.user?.client_id,
      ids,
    );

    const data = result.recommendations.map((recommendation: any) => {
      const v = recommendation.vehicle as {
        id: number;
        make: string;
        model: string;
        year: number;
        color: string | null;
        selfDriveBaseRate: number;
        fleetId: number;
        fleetCity: string;
        coverImageUrl: string | null;
        averageRating: number;
        totalRatings: number;
      };
      const row = catalogById.get(v.id);
      const vehicleForList =
        row ??
        ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          color: v.color,
          selfDriveBaseRate: v.selfDriveBaseRate,
          fleetManager: { id: v.fleetId, city: v.fleetCity },
          fleetCity: v.fleetCity,
          coverImageUrl: v.coverImageUrl,
          averageRating: v.averageRating,
          reviewCount: v.totalRatings,
          totalRatings: v.totalRatings,
        } as any);
      return this.mapVehicleListItem(vehicleForList, favoriteIds);
    });

    return { data };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('fcm/token')
  async saveFcmToken(@Req() req: ClientRequest, @Body() dto: FlutterFcmTokenDto) {
    await this.firebaseService.saveClientFcmToken({
      user_id: this.clientId(req),
      token: dto.token,
      platform: 'android',
    });
    return { message: 'FCM token saved successfully' };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('host/status')
  async hostStatus(@Req() req: ClientRequest) {
    const result = await this.hostService.getHostStatus(this.clientId(req));
    return {
      isHost: result.isHost,
      status: result.isHost ? 'active' : null,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('host/apply')
  async applyHost(@Req() req: ClientRequest, @Body() dto: BecomeHostDto) {
    const result = await this.hostService.becomeHost(this.clientId(req), dto);
    return { message: result.message };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('host/vehicles')
  async addHostVehicle(
    @Req() req: ClientRequest,
    @Body() dto: CreateVehicleDto,
  ) {
    const vehicle = await this.hostService.addHostVehicle(
      this.clientId(req),
      dto,
    );
    return { id: vehicle.id, message: 'Vehicle added successfully' };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('host/vehicles')
  async hostVehicles(@Req() req: ClientRequest) {
    const vehicles = await this.hostService.getMyHostVehicles(this.clientId(req));
    return {
      data: vehicles.map((vehicle: any) =>
        this.mapVehicleListItem(vehicle, new Set<number>()),
      ),
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('host/vehicles/:vehicleId/documents')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadHostDocuments(
    @Req() req: ClientRequest,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadVehicleDocumentsDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'At least one file is required to upload documents.',
      );
    }
    if (body.documentTypes.length !== files.length) {
      throw new BadRequestException(
        'documentTypes length must match files length',
      );
    }
    const savedDocs = await this.hostService.uploadHostVehicleDocs(
      this.clientId(req),
      vehicleId,
      files,
      body.documentTypes,
    );
    await this.triggerOcrForNonImageDocuments(savedDocs);
    return { message: 'Documents uploaded successfully' };
  }

  private async authPayload(user: any) {
    const accessToken = await this.authService.generateJwtToken(user);
    const refreshToken = await this.authService.generateRefreshToken(user);
    return {
      accessToken,
      refreshToken,
      user: this.mapUser(user),
    };
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      contact: user.contact ?? '',
      avatarUrl: user.profilePic ?? null,
    };
  }

  private async currentUser(req: ClientRequest) {
    const user = await this.usersService.findByEmail(this.clientEmail(req));
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async analytics(req: ClientRequest) {
    return this.analyticsService.getClientAnalytics(this.clientId(req));
  }

  private profilePayload(user: any, analytics: any, isHost: boolean) {
    return {
      ...this.mapUser(user),
      isHost,
      totalBookings: analytics.totalBookings,
      totalSpent: analytics.totalSpend,
    };
  }

  private mapVehicleListItem(vehicle: any, favoriteIds: Set<number>) {
    const fleet = vehicle.fleetManager ?? {};
    return {
      id: vehicle.id,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      year: Number(vehicle.year ?? 0),
      color: vehicle.color ?? '',
      pricePerDay: this.numberValue(
        vehicle.effectiveDailyRate ??
          vehicle.effectiveRate ??
          vehicle.selfDriveBaseRate,
      ),
      city: vehicle.fleetCity ?? fleet.city ?? '',
      fleetId: fleet.id ?? vehicle.fleetId ?? 0,
      thumbnailUrl: vehicle.coverImageUrl ?? null,
      averageRating: this.numberValue(vehicle.averageRating),
      totalReviews: Number(
        vehicle.totalReviews ?? vehicle.reviewCount ?? vehicle.totalRatings ?? 0,
      ),
      isFavorited: favoriteIds.has(vehicle.id),
    };
  }

  private mapVehicleDetail(vehicle: any, raw: any, isFavorited: boolean) {
    const imageUrls = (vehicle.images ?? [])
      .map((image: any) => image.url)
      .filter(Boolean);
    const fleet = raw?.fleetManager;

    return {
      id: vehicle.id,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      year: Number(vehicle.year ?? 0),
      color: vehicle.color ?? '',
      pricePerDay: this.numberValue(
        vehicle.effectiveDailyRate ??
          vehicle.effectiveRate ??
          vehicle.selfDriveBaseRate,
      ),
      city: vehicle.fleetCity ?? fleet?.city ?? '',
      fleet: {
        id: fleet?.id ?? 0,
        name: vehicle.fleetManagerName ?? fleet?.name ?? '',
        logoUrl: null,
      },
      imageUrls,
      averageRating: this.numberValue(vehicle.averageRating),
      totalReviews: Number(vehicle.totalReviews ?? vehicle.reviewCount ?? 0),
      isFavorited,
      features: this.vehicleFeatures(vehicle),
      serviceType: vehicle.driverServiceOption ?? '',
      vehicleType: vehicle.vehicleType ?? '',
    };
  }

  private mapFleetListItem(fleet: any) {
    return {
      id: fleet.id,
      name: fleet.name ?? '',
      city: fleet.city ?? '',
      logoUrl: null,
      vehicleCount: Number(fleet.totalVehicles ?? fleet.fleetManagerVehicles?.length ?? 0),
    };
  }

  private mapBooking(booking: any) {
    return {
      id: booking.id,
      status: booking.status ?? '',
      vehicle: {
        id: booking.vehicle?.id ?? 0,
        make: booking.vehicle?.make ?? '',
        model: booking.vehicle?.model ?? '',
        thumbnailUrl:
          booking.vehicle?.coverImageUrl ??
          booking.vehicle?.documents?.find((doc: any) => doc.name === 'image_coverimg')
            ?.url ??
          null,
      },
      startDate: booking.pickupDate,
      endDate: booking.returnDate,
      totalAmount: this.numberValue(
        booking.finalAmountSettled ?? booking.initialTotalCharge,
      ),
      createdAt: booking.createdAt,
    };
  }

  private vehicleFeatures(vehicle: any): string[] {
    return [
      vehicle.transmissionType,
      vehicle.fuelType,
      vehicle.seatingCapacity ? `${vehicle.seatingCapacity} seats` : null,
      vehicle.isInsured ? 'Insured' : null,
    ].filter((feature): feature is string => Boolean(feature));
  }

  private async favoriteVehicleIds(clientId: number | undefined, vehicleIds: number[]) {
    if (!clientId || vehicleIds.length === 0) {
      return new Set<number>();
    }
    const favorites = await this.favoritesRepo.find({
      where: {
        userId: clientId,
        vehicleId: In(vehicleIds),
        isActive: true,
      },
    });
    return new Set(favorites.map((favorite) => favorite.vehicleId));
  }

  private bearerToken(req: ClientRequest): string {
    const token = req.headers?.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid token format');
    }
    return token;
  }

  private clientId(req: ClientRequest): number {
    const id = req.user?.client_id;
    if (id == null || Number.isNaN(Number(id))) {
      throw new UnauthorizedException();
    }
    return Number(id);
  }

  private clientEmail(req: ClientRequest): string {
    const email = req.user?.client_email;
    if (!email) {
      throw new UnauthorizedException();
    }
    return email;
  }

  private toDriverServiceOption(serviceType?: string) {
    if (serviceType === 'self_drive') return 'self_drive_only';
    if (serviceType === 'with_driver') return 'driver_included';
    return serviceType;
  }

  private numberValue(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private async triggerOcrForNonImageDocuments(
    docs: Array<{ id: number; docType: string }>,
  ) {
    for (const doc of docs) {
      if (IMAGE_DOC_TYPES.includes(doc.docType)) {
        continue;
      }

      try {
        await this.ocrWorkflowService.processDocument(doc.id, doc.docType as any);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`OCR failed for doc ${doc.id}: ${message}`);
      }
    }
  }
}
