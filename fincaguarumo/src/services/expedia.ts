export class ExpediaService {
  private affiliateId: string

  constructor() {
    // You'll need to sign up for Expedia's affiliate program to get this ID
    this.affiliateId = process.env.NEXT_PUBLIC_EXPEDIA_AFFILIATE_ID || ""
  }

  getExpediaUrl(propertyId: string, checkin: string, checkout: string): string {
    return `https://www.expedia.com/Puerto-Jimenez-Hotels-Villa-Bruno-Handcrafted-Jungle-Hideaway-Powered-By-The-Sun-Wifi-Hot-Water.h${propertyId}.Hotel-Information?chkin=${checkin}&chkout=${checkout}&rm1=a2`
  }
}
