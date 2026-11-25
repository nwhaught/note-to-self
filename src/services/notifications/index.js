import StorageService from '../storage/StorageService';
import { NotificationScheduler } from './NotificationScheduler';

const NotificationService = new NotificationScheduler(StorageService);

export default NotificationService;
