import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApplicationStatus } from 'src/entities/entities/FleetRegistrationApplications';
import { AdminNotifications } from 'src/entities/entities/AdminNotifications';
import { FleetRegistrationApplications } from 'src/entities/entities/FleetRegistrationApplications';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { Subscriptions } from 'src/entities/entities/Subscriptions';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/Nodemailer/mailer.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class AdminNotificationService {
  constructor(
    @InjectRepository(AdminNotifications)
    private readonly notifRepo: Repository<AdminNotifications>,

    @InjectRepository(FleetRegistrationApplications)
    private readonly appRepo: Repository<FleetRegistrationApplications>,

    @InjectRepository(FleetManagers)
    private readonly fleetRepo: Repository<FleetManagers>,

    @InjectRepository(FleetManagerUsers)
    private readonly fleetUserRepo: Repository<FleetManagerUsers>,

    @InjectRepository(FleetManagerUsersRole)
    private readonly fleetUserRoleRepo: Repository<FleetManagerUsersRole>,

    private readonly notificationService: FirebaseService,
    private readonly mailService: MailService,
  ) {}

  async getAllNotifications(adminId: number) {
    const notifications = await this.notifRepo.find({
      where: { receiver: { id: adminId } },
      relations: ['sender', 'sender.fleetManager', 'request', 'application'],
      select: {
        id: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        notiType: true,
        redirectUrl: true,
        sender: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          fleetManager: { id: true, name: true },
        },
        request: { id: true, requestType: true, requestStatus: true },
        application: {
          id: true,
          businessName: true,
          status: true,
          email: true,
          contact: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return { notifications, unreadCount };
  }

  async getNotificationById(notifId: number, adminId: number) {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, receiver: { id: adminId } },
      relations: [
        'sender',
        'sender.fleetManager',
        'request',
        'application',
        'application.fleetManagersDocuments',
        'application.reviewedBy',
      ],
    });

    if (!notif) throw new NotFoundException('Notification not found');

    if (!notif.isRead) {
      await this.notifRepo.update(notifId, {
        isRead: true,
        readAt: new Date(),
      });
      notif.isRead = true;
      notif.readAt = new Date();
    }

    return notif;
  }

  async markAsRead(notifId: number, adminId: number) {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, receiver: { id: adminId } },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.isRead) return { message: 'Already read' };

    await this.notifRepo.update(notifId, { isRead: true, readAt: new Date() });
    return { message: 'Marked as read' };
  }

  async markAllAsRead(adminId: number) {
    await this.notifRepo.update(
      { receiver: { id: adminId }, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  async approveApplication(applicationId: number, adminId: number) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application already approved');
    }

    const fleet = this.fleetRepo.create({
      name: application.businessName,
      email: application.email,
      contact: application.contact,
      city: application.city,
      state: application.state,
      country: application.country,
      address: application.address,
      type: application.fleetType,
      isActive: true,
      isDelete: false,
      createdAt: new Date(),
      subscriptionId: application.subscriptions ? application.subscriptions.id : null,
    });
    const savedFleet = await this.fleetRepo.save(fleet);

    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const adminRole = await this.fleetUserRoleRepo.findOne({
      where: { roleName: 'Admin' },
    });
    if (!adminRole)
      throw new InternalServerErrorException('Admin role not found');

    const fleetUser = this.fleetUserRepo.create({
      firstName: application.ownerFirstName,
      lastName: application.ownerLastName,
      email: application.email,
      contact: application.contact,
      password: hashedPassword,
      fmUsersRole: { id: adminRole.id },
      fleetManager: { id: savedFleet.id },
      isActive: false,
      isFirstlogin: true,
      isDelete: false,
      createdAt: new Date(),
    });
    const savedUser = await this.fleetUserRepo.save(fleetUser);

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.APPROVED,
      reviewedBy: { id: adminId } as any,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await this.mailService.sendTemplatedMail(
        application.email,
        'Welcome to CarLo — Set Your Password',
        'fleet_invitation',
        {
          username: application.ownerFirstName,
          companyName: application.businessName,
          useremail: application.email,
          resetLink: `http://localhost:5175/set-password?email=${application.email}`,
        },
      );
    } catch {
      console.error('Welcome email failed for:', application.email);
    }

    await this.notificationService.saveAndSendNotificationToAdmins({
      title: '✅ Application Approved',
      body: `${application.businessName} has been approved. Fleet #${savedFleet.id} created.`,
      type: 'shop_registration',
      application_id: applicationId,
    });

    return {
      message: 'Application approved',
      fleet_id: savedFleet.id,
      user_id: savedUser.id,
    };
  }

  async rejectApplication(
    applicationId: number,
    adminId: number,
    rejectionReason: string,
  ) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException('Application already rejected');
    }

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.REJECTED,
      rejectionReason,
      reviewedBy: { id: adminId } as any,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await this.mailService.sendTemplatedMail(
        application.email,
        'CarLo — Application Update',
        'fleet_rejection',
        {
          username: application.ownerFirstName,
          companyName: application.businessName,
          reason: rejectionReason,
        },
      );
    } catch {
      console.error('Rejection email failed for:', application.email);
    }

    return { message: 'Application rejected' };
  }

  async markUnderReview(applicationId: number, adminId: number) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.UNDER_REVIEW,
      reviewedBy: { id: adminId } as any,
      updatedAt: new Date(),
    });

    return { message: 'Application marked as under review' };
  }
}
