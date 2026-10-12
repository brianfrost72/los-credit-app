import { Capacitor } from '@capacitor/core';

export const Platform = {
	isMobile(): boolean {
		return Capacitor.isNativePlatform();
	},

	isDesktop(): boolean {
		return !Capacitor.isNativePlatform();
	},

	get(): 'mobile' | 'desktop' {
		return Capacitor.isNativePlatform() ? 'mobile' : 'desktop';
	}
};