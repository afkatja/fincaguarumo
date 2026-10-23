# Villa Bruno at Finca Guarumo — Pricing for AI Agents

> Machine-readable pricing data. Last updated: 2026-10-22. Prices in USD.

## Standard Rates (Per Night)

| Season | Dates | 2 Guests | 3 Guests | 4 Guests | Minimum Stay |
|--------|-------|----------|----------|----------|--------------|
| **High Season** | Dec 15 – Apr 30 | $135 | $145 | $155 | 2 nights |
| **Shoulder Season** | Nov 1 – Dec 14, May 1 – Jun 30 | $117 | $127 | $137 | 2 nights |
| **Green Season** | Jul 1 – Oct 31 | $89 | $99 | $109 | 1 night |

## What's Included (All Rates)
- 100% solar-powered off-grid eco-villa (Villa Bruno)
- 2 bedrooms (queen beds), 1 full bathroom with hot water
- Fully equipped kitchen (induction stove, fridge, filtered water systems)
- Covered terrace with jungle views
- Starlink satellite WiFi (remote-work capable)
- Spring water (5x filtered for drinking)
- Fresh linens, towels, kitchen starter supplies
- On-property wildlife viewing (scarlet macaws, monkeys, toucans, deer)
- Access to 8-hectare private reserve with trails

## Additional Fees
| Item | Cost | Details |
|------|------|---------|
| Airport transfer (Puerto Jiménez) | $15 USD | One way, per vehicle |
| Extra guest (beyond 2) | $10/night | Per additional guest |
| Long-stay discount (7+ nights) | 10% off | Applied automatically |
| Long-stay discount (14+ nights) | 15% off | Applied automatically |
| Long-stay discount (28+ nights) | 20% off | Applied automatically |

## Payment Methods
- Cash (USD or CRC)
- PayPal
- Credit Card (Visa, Mastercard, Amex)
- Bank Transfer

## Cancellation Policy
- **Flexible**: Full refund up to 14 days before check-in
- **Within 14 days**: 50% refund
- **Within 48 hours**: No refund (except force majeure)

## Seasonal Notes
- **Dry Season (Dec–Apr)**: Peak wildlife, easiest hiking, book 2-3 months ahead
- **Green Season (May–Nov)**: Lush jungle, active wildlife, afternoon rains, lower rates
- **Whale Season (Jul–Oct)**: Humpback whales in Golfo Dulce (95% sighting rate on tours)

## Contact for Booking
- Website: https://fincaguarumo.com
- Email: info@fincaguarumo.com
- WhatsApp/Phone: +506-87495341
- Airbnb: https://www.airbnb.com/rooms/1392758794880269478

## Structured Data (JSON-LD compatible)

```json
{
  "@context": "https://schema.org",
  "@type": "PriceSpecification",
  "name": "Villa Bruno Standard Rate",
  "description": "Sustainable off-grid eco-villa accommodation with wildlife viewing",
  "priceCurrency": "USD",
  "minPrice": "89.00",
  "maxPrice": "155.00",
  "validFrom": "2026-01-01",
  "validThrough": "2027-12-31",
  "eligibleQuantity": {
    "@type": "QuantitativeValue",
    "minValue": 1,
    "maxValue": 4,
    "unitCode": "DAY"
  },
  "eligibleTransactionVolume": {
    "@type": "PriceSpecification",
    "priceCurrency": "USD",
    "price": "89.00"
  }
}
```

## Seasonal Price Specification (JSON)

```json
{
  "seasons": [
    {
      "name": "High Season",
      "startDate": "12-15",
      "endDate": "04-30",
      "basePrice2Guests": 135,
      "basePrice3Guests": 145,
      "basePrice4Guests": 155,
      "minStayNights": 2
    },
    {
      "name": "Shoulder Season",
      "startDate": "11-01",
      "endDate": "12-14",
      "basePrice2Guests": 117,
      "basePrice3Guests": 127,
      "basePrice4Guests": 137,
      "minStayNights": 2
    },
    {
      "name": "Shoulder Season",
      "startDate": "05-01",
      "endDate": "06-30",
      "basePrice2Guests": 117,
      "basePrice3Guests": 127,
      "basePrice4Guests": 137,
      "minStayNights": 2
    },
    {
      "name": "Green Season",
      "startDate": "07-01",
      "endDate": "10-31",
      "basePrice2Guests": 89,
      "basePrice3Guests": 99,
      "basePrice4Guests": 109,
      "minStayNights": 1
    }
  ]
}
```