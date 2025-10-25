// import { NextRequest, NextResponse } from "next/server";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// // Initialize S3 client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "us-east-1",
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// const BUCKET_NAME = process.env.S3_BUCKET_NAME || "your-api-logs-bucket";

// const AVAILABLE_PLACE_TYPES = [
//   "accounting",
//   "airport",
//   "amusement_park",
//   "aquarium",
//   "art_gallery",
//   "atm",
//   "bakery",
//   "bank",
//   "bar",
//   "beauty_salon",
//   "bicycle_store",
//   "book_store",
//   "bowling_alley",
//   "bus_station",
//   "cafe",
//   "campground",
//   "car_dealer",
//   "car_rental",
//   "car_repair",
//   "car_wash",
//   "casino",
//   "cemetery",
//   "church",
//   "city_hall",
//   "clothing_store",
//   "convenience_store",
//   "courthouse",
//   "dentist",
//   "department_store",
//   "doctor",
//   "drugstore",
//   "electrician",
//   "electronics_store",
//   "embassy",
//   "fire_station",
//   "florist",
//   "funeral_home",
//   "furniture_store",
//   "gas_station",
//   "gym",
//   "hair_care",
//   "hardware_store",
//   "hindu_temple",
//   "home_goods_store",
//   "hospital",
//   "insurance_agency",
//   "jewelry_store",
//   "laundry",
//   "lawyer",
//   "library",
//   "light_rail_station",
//   "liquor_store",
//   "local_government_office",
//   "locksmith",
//   "lodging",
//   "meal_delivery",
//   "meal_takeaway",
//   "mosque",
//   "movie_rental",
//   "movie_theater",
//   "moving_company",
//   "museum",
//   "night_club",
//   "painter",
//   "park",
//   "parking",
//   "pet_store",
//   "pharmacy",
//   "physiotherapist",
//   "plumber",
//   "police",
//   "post_office",
//   "primary_school",
//   "real_estate_agency",
//   "restaurant",
//   "roofing_contractor",
//   "rv_park",
//   "school",
//   "secondary_school",
//   "shoe_store",
//   "shopping_mall",
//   "spa",
//   "stadium",
//   "storage",
//   "store",
//   "subway_station",
//   "supermarket",
//   "synagogue",
//   "taxi_stand",
//   "tourist_attraction",
//   "train_station",
//   "transit_station",
//   "travel_agency",
//   "university",
//   "veterinary_care",
//   "zoo",
// ];

// // Helper function to validate that each route has at least one location per category type
// function validateLocationTypeDistribution(
//   extractedLocations: any[],
//   selectedPlaceTypes: string[],
//   availablePlaces: any[]
// ): any[] {
//   if (!selectedPlaceTypes || selectedPlaceTypes.length === 0) {
//     return extractedLocations;
//   }

//   // Count how many locations we have for each place type
//   const locationsByType: { [key: string]: any[] } = {};
//   selectedPlaceTypes.forEach(type => {
//     locationsByType[type] = [];
//   });

//   // Categorize existing locations by their type
//   extractedLocations.forEach(location => {
//     const locationType = location.type;
//     if (selectedPlaceTypes.includes(locationType)) {
//       locationsByType[locationType].push(location);
//     }
//   });

//   // Check which types are missing
//   const missingTypes = selectedPlaceTypes.filter(
//     type => locationsByType[type].length === 0
//   );

//   console.log(`🔍 Location type distribution:`, locationsByType);
//   console.log(`⚠️ Missing types:`, missingTypes);

//   // If we have missing types, try to add one location for each missing type
//   if (missingTypes.length > 0) {
//     const enhancedLocations = [...extractedLocations];
    
//     missingTypes.forEach(missingType => {
//       // Find available places of this type that aren't already included
//       const existingIds = new Set(enhancedLocations.map(loc => loc.id));
//       const availableForType = availablePlaces.filter(
//         place => place.placeType === missingType && !existingIds.has(place.id)
//       );

//       if (availableForType.length > 0) {
//         // Pick the highest rated available place of this type
//         const bestPlace = availableForType.reduce((best, current) => 
//           (current.rating || 0) > (best.rating || 0) ? current : best
//         );

//         const newLocation = {
//           id: bestPlace.id,
//           name: bestPlace.displayName,
//           location: bestPlace.location,
//           type: bestPlace.placeType,
//           tags: bestPlace.types,
//           formatted_address: bestPlace.formattedAddress,
//           rating: bestPlace.rating,
//           user_rating_total: bestPlace.userRatingCount,
//           price_level: bestPlace.priceLevel,
//           order: enhancedLocations.length + 1,
//         };

//         enhancedLocations.push(newLocation);
//         console.log(`✅ Added ${bestPlace.displayName} to ensure ${missingType} coverage`);
//       } else {
//         console.log(`⚠️ No available ${missingType} venues to add`);
//       }
//     });

//     return enhancedLocations;
//   }

//   return extractedLocations;
// }

// // Helper function to extract locations from the generated plan with ordering
// function extractLocationsFromPlan(eventPlan: string, placesData: any[], selectedPlaceTypes: string[] = []) {
//   try {
//     // Extract mentioned place names from the plan and match them to the places data
//     const plannedLocations = [];
//     const planLower = eventPlan.toLowerCase();

//     // Create array of matches with their position in the plan text
//     const matches = [];

//     for (const place of placesData) {
//       const placeNameLower = place.displayName.toLowerCase();
//       const position = planLower.indexOf(placeNameLower);

//       if (position !== -1) {
//         matches.push({
//           place,
//           position,
//           data: {
//             id: place.id,
//             name: place.displayName,
//             location: place.location,
//             type: place.placeType,
//             tags: place.types,
//             formatted_address: place.formattedAddress,
//             rating: place.rating,
//             user_rating_total: place.userRatingCount,
//             price_level: place.priceLevel,
//           },
//         });
//       }
//     }

//     // Sort by position in the plan text (earliest mention first)
//     matches.sort((a, b) => a.position - b.position);

//     // Create a Map to track the highest rated place for each name
//     const bestMatchByName = new Map();

//     // First pass: Find the highest rated place for each name
//     matches.forEach((match) => {
//       const existingMatch = bestMatchByName.get(match.place.displayName);
//       if (
//         !existingMatch ||
//         (match.place.rating || 0) > (existingMatch.place.rating || 0)
//       ) {
//         bestMatchByName.set(match.place.displayName, match);
//       }
//     });

//     // Second pass: Filter matches to keep only the highest rated place for each name
//     const uniqueMatches = matches.filter(
//       (match) => bestMatchByName.get(match.place.displayName) === match
//     );

//     // Add order number to each location
//     const orderedLocations = uniqueMatches.map((match, index) => ({
//       ...match.data,
//       order: index + 1, // 1-based numbering
//     }));

//     if (uniqueMatches.length !== matches.length) {
//       console.log(
//         `✅ Removed ${
//           matches.length - uniqueMatches.length
//         } duplicate venue mentions from extracted locations`
//       );
//     }

//     // Validate and ensure we have at least one location per selected place type
//     const validatedLocations = validateLocationTypeDistribution(
//       orderedLocations,
//       selectedPlaceTypes,
//       placesData
//     );

//     console.log("OrderedLocations:", validatedLocations);

//     return validatedLocations;
//   } catch (error) {
//     console.error("Error extracting locations from plan:", error);
//     return [];
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const {
//       startingLocation,
//       hourRange,
//       numberOfPeople,
//       radius,
//       ageRange,
//       budget,
//       eventDate,
//       startTime,
//       endTime,
//       eventDescription,
//       numberOfRoutes = 3, // Default to 3 routes
//     } = await request.json();

//     console.log("Received multiple routes request:", {
//       startingLocation,
//       hourRange,
//       numberOfPeople,
//       radius,
//       ageRange,
//       budget,
//       eventDate,
//       startTime,
//       endTime,
//       eventDescription,
//       numberOfRoutes,
//     });

//     if (!startingLocation?.location?.lat || !startingLocation?.location?.lng) {
//       return NextResponse.json(
//         { success: false, error: "Starting location is required" },
//         { status: 400 }
//       );
//     }

//     // Hard-coded requirement: time range must be at least 1 hour long
//     if (!hourRange || hourRange < 1) {
//       return NextResponse.json(
//         { success: false, error: "Time range must be at least 1 hour long" },
//         { status: 400 }
//       );
//     }

//     console.log("🎯 Starting multiple routes generation workflow...");

//     // Step 1: Dynamically select place types based on event description
//     let selectedPlaceTypes: string[];
//     try {
//       selectedPlaceTypes = await selectPlaceTypesWithGemini(eventDescription);
//       console.log(
//         `🤖 Gemini selected place types for multiple routes: ${selectedPlaceTypes.join(
//           ", "
//         )}`
//       );

//       // Prominent logging for the main endpoint
//       console.log(
//         "🚀 ════════════════════════════════════════════════════════"
//       );
//       console.log("🚀 FINAL GEMINI CATEGORIES FOR ROUTE GENERATION");
//       console.log(
//         "🚀 ════════════════════════════════════════════════════════"
//       );
//       console.log(`📍 Event: "${eventDescription}"`);
//       console.log("🏷️  Categories to search:");
//       selectedPlaceTypes.forEach((type, index) => {
//         console.log(`     • ${type.toUpperCase()}`);
//       });
//       console.log(
//         "🚀 ════════════════════════════════════════════════════════"
//       );

//       // Additional validation - ensure no empty results
//       if (!selectedPlaceTypes || selectedPlaceTypes.length === 0) {
//         console.warn(
//           "⚠️ Gemini returned empty place types array, using generic defaults"
//         );
//         selectedPlaceTypes = ["tourist_attraction", "park", "museum"];

//         // Prominent empty result logging
//         console.log(
//           "⚠️  ═══════════════════════════════════════════════════════"
//         );
//         console.log("⚠️  EMPTY GEMINI RESPONSE - USING DEFAULTS");
//         console.log(
//           "⚠️  ═══════════════════════════════════════════════════════"
//         );
//         console.log(`📍 Event: "${eventDescription}"`);
//         console.log("🏷️  Default Categories:");
//         selectedPlaceTypes.forEach((type, index) => {
//           console.log(`     • ${type.toUpperCase()}`);
//         });
//         console.log(
//           "⚠️  ═══════════════════════════════════════════════════════"
//         );
//       }
//     } catch (error) {
//       console.error("❌ Failed to select place types with Gemini:", error);
//       // Use more diverse defaults instead of restaurant-heavy ones
//       selectedPlaceTypes = ["tourist_attraction", "park", "museum"];
//       console.log(
//         `🔄 Using fallback place types: ${selectedPlaceTypes.join(", ")}`
//       );

//       // Prominent fallback logging
//       console.log(
//         "⚠️  ═══════════════════════════════════════════════════════"
//       );
//       console.log("⚠️  FALLBACK CATEGORIES (GEMINI UNAVAILABLE)");
//       console.log(
//         "⚠️  ═══════════════════════════════════════════════════════"
//       );
//       console.log(`📍 Event: "${eventDescription}"`);
//       console.log("🏷️  Default Categories:");
//       selectedPlaceTypes.forEach((type, index) => {
//         console.log(`     • ${type.toUpperCase()}`);
//       });
//       console.log(
//         "⚠️  ═══════════════════════════════════════════════════════"
//       );
//     }

//     // Step 1 (continued): Search for nearby places using the AI-selected types
//     const placesData = await searchNearbyPlaces({
//       latitude: startingLocation.location.lat,
//       longitude: startingLocation.location.lng,
//       radiusInMeters: radius || 1000,
//       placeTypes: selectedPlaceTypes,
//     });

//     if (!placesData || placesData.length === 0) {
//       return NextResponse.json(
//         { success: false, error: "No places found in the specified area" },
//         { status: 404 }
//       );
//     }

//     console.log(`🔍 Found ${placesData.length} places in the area`);

//     // Add debugging after each line to find exactly where it fails
//     console.log("✅ Debug point 1 - About to create timestamp");

//     // Step 2: Save places data to S3 JSON file
//     const timestamp = Date.now();
//     console.log("✅ Debug point 2 - Timestamp created:", timestamp);

//     const fileName = `multiple-routes-places-${timestamp}.json`;
//     console.log("✅ Debug point 3 - Filename created:", fileName);

//     console.log("✅ Debug point 4 - About to create placeDataStructure");
//     const placeDataStructure = {
//       timestamp,
//       searchLocation: startingLocation.location,
//       searchRadius: radius,
//       placeType: "multiple-routes-planning",
//       eventParameters: {
//         hourRange,
//         numberOfPeople,
//         ageRange,
//         budget,
//         eventDate,
//         startTime,
//         endTime,
//         eventDescription,
//         startingLocation,
//       },
//       searchMetadata: {
//         totalFound: placesData.length,
//         searchedAt: new Date().toISOString(),
//         radiusMeters: radius,
//       },
//       places: placesData,
//     };
//     console.log("✅ Debug point 5 - placeDataStructure created");

//     // ADD THIS: Debug S3 configuration at the start
//     console.log("🔧 S3 Configuration Debug:");
//     console.log("AWS_ACCESS_KEY_ID exists:", !!process.env.AWS_ACCESS_KEY_ID);
//     console.log(
//       "AWS_SECRET_ACCESS_KEY exists:",
//       !!process.env.AWS_SECRET_ACCESS_KEY
//     );
//     console.log("AWS_REGION:", process.env.AWS_REGION);
//     console.log("S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME);

//     if (
//       !process.env.AWS_ACCESS_KEY_ID ||
//       !process.env.AWS_SECRET_ACCESS_KEY ||
//       !process.env.S3_BUCKET_NAME
//     ) {
//       console.error("❌ Missing required S3 environment variables");
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Server configuration error: Missing S3 credentials",
//         },
//         { status: 500 }
//       );
//     }

//     // MODIFY THE S3 UPLOAD SECTION:
//     console.log("💾 Attempting to save to S3...");
//     try {
//       const s3Key = `api_logs/${fileName}`;
//       console.log("S3 Key:", s3Key);
//       console.log("Bucket:", BUCKET_NAME);

//       const putCommand = new PutObjectCommand({
//         Bucket: BUCKET_NAME,
//         Key: s3Key,
//         Body: JSON.stringify(placeDataStructure, null, 2),
//         ContentType: "application/json",
//       });

//       const s3Response = await s3Client.send(putCommand);
//       console.log(`✅ Successfully saved to S3: ${s3Key}`, s3Response);
//     } catch (s3Error) {
//       console.error("❌ S3 upload failed:", s3Error);
//       console.error("Error details:", JSON.stringify(s3Error, null, 2));

//       // DO NOT write to local file system - return error instead
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Failed to save data to cloud storage",
//           details:
//             s3Error instanceof Error ? s3Error.message : "Unknown S3 error",
//         },
//         { status: 500 }
//       );
//     }

//     console.log(`📊 Original places data: ${placesData.length} places`);
//     console.log(
//       `📝 Sample places:`,
//       placesData
//         .slice(0, 3)
//         .map((p) => ({ name: p.displayName, type: p.placeType }))
//     );

//     // Age analysis and filtering
//     console.log("[generate-multiple-routes] Received ageRange:", ageRange);

//     // Parse age range - handle both array [min, max] and string formats
//     const parseAgeRange = (ageRange: [number, number] | string | undefined) => {
//       if (Array.isArray(ageRange) && ageRange.length === 2) {
//         const [minAge, maxAge] = ageRange;
//         return {
//           includesBelow21: minAge < 21,
//           isAllBelow21: maxAge < 21,
//           minAge,
//           maxAge,
//         };
//       }

//       // Handle string format as fallback
//       const ageRangeText = String(ageRange || "");
//       const includesBelow21 =
//         ageRangeText.toLowerCase().includes("under 21") ||
//         ageRangeText.toLowerCase().includes("18-20") ||
//         ageRangeText.toLowerCase().includes("16-20") ||
//         ageRangeText.toLowerCase().includes("all ages") ||
//         ageRangeText.match(/\b(1[0-9]|20)\b/) || // matches 10-20
//         ageRangeText.toLowerCase().includes("children") ||
//         ageRangeText.toLowerCase().includes("kids") ||
//         ageRangeText.toLowerCase().includes("family");

//       const isAllBelow21 =
//         ageRangeText.toLowerCase().includes("under 21") ||
//         ageRangeText.toLowerCase().includes("16-20") ||
//         ageRangeText.match(/\b(1[0-9])\b/); // matches 10-19

//       return {
//         includesBelow21,
//         isAllBelow21,
//         minAge: 0,
//         maxAge: 100,
//       };
//     };

//     const ageAnalysis = parseAgeRange(ageRange);
//     console.log(`🔍 Age range analysis:`, ageAnalysis);

//     // Check for alcohol mentions in event description
//     const alcoholKeywords = [
//       "alcohol",
//       "drink",
//       "bar",
//       "pub",
//       "wine",
//       "beer",
//       "cocktail",
//       "liquor",
//       "brewery",
//       "winery",
//       "drinking",
//     ];
//     const hasAlcoholMention = alcoholKeywords.some((keyword) =>
//       eventDescription.toLowerCase().includes(keyword)
//     );

//     // Error case: All people under 21 AND alcohol mentioned
//     if (ageAnalysis.isAllBelow21 && hasAlcoholMention) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             "Your event description mentions alcohol but includes people under 21. Please remove alcohol references or adjust the age range and try again.",
//         },
//         { status: 400 }
//       );
//     }

//     // Filter alcohol venues if minors are included
//     let filteredPlacesData = placesData;
//     if (ageAnalysis.includesBelow21) {
//       filteredPlacesData = placesData.filter((place) => {
//         const placeTypes = place.types || [];
//         const placeType = place.placeType || "";
//         return (
//           !placeTypes.includes("bar") &&
//           !placeTypes.includes("night_club") &&
//           !placeTypes.includes("liquor_store") &&
//           placeType !== "bar" &&
//           placeType !== "night_club" &&
//           placeType !== "liquor_store"
//         );
//       });
//       console.log(
//         `🔒 Filtered out bars/night clubs/liquor stores due to age range including people under 21: ${ageRange}. Remaining venues: ${filteredPlacesData.length}`
//       );
//     }

//     // Step 3: Generate multiple different route options using the same criteria
//     const routes = [];

//     // Create shuffled versions of the places data for variety while maintaining quality
//     const shuffledPlacesVersions = [];
//     for (let i = 0; i < numberOfRoutes; i++) {
//       const shuffledPlaces = [...filteredPlacesData]
//         .sort(() => Math.random() - 0.5) // Randomize order
//         .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Still prioritize highly rated places
//         .slice(0, Math.min(12, filteredPlacesData.length)); // Take top 12 for selection variety
//       shuffledPlacesVersions.push(shuffledPlaces);
//     }

//     for (let i = 0; i < numberOfRoutes; i++) {
//       console.log(`🛣️ Generating route option ${i + 1}/${numberOfRoutes}...`);

//       // Use different starting points in the shuffled data for variety
//       const startIndex = i * 3; // Offset starting position for each route
//       let filteredPlaces = shuffledPlacesVersions[i]
//         .slice(startIndex)
//         .concat(shuffledPlacesVersions[i].slice(0, startIndex)) // Wrap around if needed
//         .slice(0, 8); // Take up to 8 places

//       // CRITICAL: Remove any duplicates from filtered places based on place ID
//       filteredPlaces = filteredPlaces.filter(
//         (place, index, self) =>
//           index === self.findIndex((p) => p.id === place.id)
//       );

//       // If we don't have enough places, add more from the original data
//       if (filteredPlaces.length < 3) {
//         const additionalPlaces = placesData
//           .filter((p) => !filteredPlaces.find((fp) => fp.id === p.id))
//           .sort((a, b) => (b.rating || 0) - (a.rating || 0))
//           .slice(0, 6);
//         filteredPlaces = [...filteredPlaces, ...additionalPlaces];

//         // Final deduplication after adding additional places
//         filteredPlaces = filteredPlaces.filter(
//           (place, index, self) =>
//             index === self.findIndex((p) => p.id === place.id)
//         );
//       }

//       console.log(
//         `✅ Selected ${filteredPlaces.length} unique venues for route option ${
//           i + 1
//         }`
//       );

//       // Generate event plan for this route
//       const eventPlan = await generateEventPlanWithGemini({
//         places: filteredPlaces,
//         hourRange,
//         numberOfPeople,
//         eventDescription,
//         startingLocation,
//         routeNumber: i + 1,
//         totalRoutes: numberOfRoutes,
//         budget,
//         ageRange,
//       });

//       // Extract planned locations for this route
//       const plannedLocations = extractLocationsFromPlan(eventPlan, placesData, selectedPlaceTypes);

//       // Create route data
//       const routeData = {
//         startingLocation,
//         hourRange,
//         numberOfPeople,
//         radius,
//         ageRange,
//         budget,
//         eventDescription,
//         eventDate,
//         startTime,
//         endTime,
//         suggestedPlan: eventPlan,
//         plannedLocations,
//         placesFound: placesData.length,
//         routeNumber: i + 1,
//         routeName: `Planned Route ${i + 1}`,
//         metadata: {
//           timestamp,
//           searchLocation: startingLocation.location,
//           radius,
//           eventParameters: {
//             hourRange,
//             numberOfPeople,
//             eventDescription,
//             eventDate,
//             startTime,
//             endTime,
//             ageRange,
//             budget,
//           },
//           selectedPlaceTypes,
//         },
//       };

//       routes.push(routeData);

//       // Add delay between API calls to avoid rate limiting
//       if (i < numberOfRoutes - 1) {
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }

//     console.log(`✅ Generated ${routes.length} different route options`);

//     return NextResponse.json({
//       success: true,
//       routes,
//       placesFound: placesData.length,
//       fileName,
//       metadata: {
//         timestamp,
//         searchLocation: startingLocation.location,
//         radius,
//         eventParameters: {
//           hourRange,
//           numberOfPeople,
//           eventDescription,
//           eventDate,
//           startTime,
//           endTime,
//           ageRange,
//           budget,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error in multiple routes generation:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to generate multiple routes. Please try again.",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }

// // Helper function to search for nearby places using Google Places API
// async function searchNearbyPlaces(params: {
//   latitude: number;
//   longitude: number;
//   radiusInMeters: number;
//   placeTypes: string[];
// }) {
//   try {
//     console.log("🔍 Searching for nearby places using Google Places API...");

//     const apiKey =
//       process.env.GOOGLE_MAPS_API_KEY ||
//       process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
//     if (!apiKey) {
//       throw new Error("Google Maps API key not configured");
//     }

//     const allPlaces = [];

//     // Search for each place type separately to ensure we get results for each category
//     for (const placeType of params.placeTypes) {
//       try {
//         const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${params.latitude},${params.longitude}&radius=${params.radiusInMeters}&type=${placeType}&key=${apiKey}`;

//         const response = await fetch(url);

//         if (!response.ok) {
//           console.warn(`Error searching for ${placeType}: ${response.status}`);
//           continue;
//         }

//         const data = await response.json();

//         if (data.results && data.results.length > 0) {
//           const formattedPlaces = data.results
//             .filter((place: any) => place.place_id && place.geometry)
//             .map((place: any) => {
//               // Use the actual place type from Google Places API instead of hardcoding
//               const primaryType = placeType; // Use the search type as the primary type

//               return {
//                 id: place.place_id,
//                 displayName: place.name || `Unknown ${primaryType}`,
//                 formattedAddress: place.vicinity || place.formatted_address,
//                 location: {
//                   lat: place.geometry.location.lat,
//                   lng: place.geometry.location.lng,
//                 },
//                 rating: place.rating,
//                 userRatingCount: place.user_ratings_total,
//                 priceLevel: place.price_level,
//                 types: place.types || [],
//                 placeType: primaryType,
//                 businessStatus: place.business_status,
//                 photos: place.photos,
//                 detailsFetchedAt: new Date().toISOString(),
//               };
//             });

//           allPlaces.push(...formattedPlaces);
//         }

//         await new Promise((resolve) => setTimeout(resolve, 200));
//       } catch (typeError) {
//         console.warn(`Error searching for ${placeType}:`, typeError);
//       }
//     }

//     // Remove duplicates based on place ID
//     const uniquePlaces = allPlaces.filter(
//       (place, index, self) => index === self.findIndex((p) => p.id === place.id)
//     );

//     console.log(`🔍 Found ${uniquePlaces.length} unique places`);
//     return uniquePlaces;
//   } catch (error) {
//     console.error("Error searching places:", error);
//     throw new Error("Failed to search for nearby places");
//   }
// }

// // Helper function to generate event plan with Gemini
// async function generateEventPlanWithGemini(params: {
//   places: any[];
//   hourRange: number;
//   numberOfPeople: number;
//   eventDescription: string;
//   startingLocation: any;
//   routeNumber: number;
//   totalRoutes: number;
//   budget?: number;
//   ageRange?: [number, number] | string;
// }) {
//   try {
//     console.log(
//       `🤖 Starting Gemini event plan generation for route ${params.routeNumber}/${params.totalRoutes}`
//     );

//     if (!process.env.GEMINI_API_KEY) {
//       console.error("❌ GEMINI API key not found in environment variables");
//       return generateFallbackPlan(params);
//     }

//     const routeName = `Planned Route ${params.routeNumber}`;

//     // IMPROVED PROMPT WITH SYSTEM INSTRUCTIONS
//     const systemInstruction = {
//       parts: [
//         {
//           text: `You are an expert travel planner specializing in creating practical, budget-conscious itineraries. Your expertise includes:
//           - Analyzing location data for optimal routing and timing
//           - Budget estimation based on local price levels
//           - Cultural and experiential insights
//           - Logistical optimization for group travel
          
//           Always prioritize feasibility over idealism, ensuring all recommendations are practical and achievable within given constraints.`,
//         },
//       ],
//     };

//     let filteredPlaces = params.places;

//     const eventPlanPrompt = `
// # TRAVEL PLANNING TASK

// ## ROUTE CONTEXT
//         Planned Route ${params.routeNumber} of ${params.totalRoutes}
//         Create a unique and engaging plan that offers a different experience from the other planned routes.

// ## INPUT PARAMETERS
// - **Duration**: ${params.hourRange} hours total
// - **Group Size**: ${params.numberOfPeople} people  
// - **Age Range**: ${
//       Array.isArray(params.ageRange)
//         ? `${params.ageRange[0]} to ${params.ageRange[1]}`
//         : params.ageRange || "Not specified"
//     }
// - **Event Type**: ${params.eventDescription}
// - **Budget**: ${
//       params.budget
//         ? `$${params.budget} USD per person (total budget: $${
//             params.budget * params.numberOfPeople
//           } for ${params.numberOfPeople} people)`
//         : "Budget not specified - provide cost estimates"
//     }
// - **Starting Point**: Coordinates ${params.startingLocation.location.lat}, ${
//       params.startingLocation.location.lng
//     }
// - **Available Locations**: 
// ${JSON.stringify(filteredPlaces, null, 2)}

// ## PLANNING REQUIREMENTS

// ### 1. CONSTRAINT ANALYSIS
// Before creating the itinerary, analyze:
// - Travel distances between locations (estimate travel times)
// - Price levels for dining/activities based on location data
// - Opening hours and availability
// - Group logistics for ${params.numberOfPeople} people

// ### 2. ROUTE OPTIMIZATION  
// - Minimize unnecessary travel between distant locations
// - Consider traffic patterns and transit efficiency
// - Allocate realistic time buffers between activities
// - Plan for group coordination needs

// ### 3. BUDGET CONSCIOUSNESS
// - Prioritize venues with appropriate price points for the ${
//       params.budget
//         ? `$${params.budget} per person budget`
//         : "specified budget range"
//     }
// - ${
//       params.budget
//         ? `Ensure estimated costs stay within $${
//             params.budget
//           } per person (total group budget: $${
//             params.budget * params.numberOfPeople
//           })`
//         : "Suggest cost-effective alternatives when available"
//     }
// - Consider group discounts but maintain per-person budget of ${
//       params.budget ? `$${params.budget}` : "specified amount"
//     }
// - ${
//       params.budget
//         ? `Calculate costs per person to stay within the $${params.budget} individual budget`
//         : "Estimate total approximate costs per person"
//     }

// ### 4. AGE-APPROPRIATE VENUE SELECTION
// - **Age Range Consideration**: ${
//       Array.isArray(params.ageRange)
//         ? `${params.ageRange[0]} to ${params.ageRange[1]}`
//         : params.ageRange || "Not specified"
//     }
// - ${
//       Array.isArray(params.ageRange) && params.ageRange[0] < 21
//         ? "**IMPORTANT**: This group includes people under 21 - DO NOT suggest bars, night clubs, or alcohol-focused venues"
//         : "Age range allows for all venue types including bars if appropriate for the event"
//     }
// - Select venues that are suitable and accessible for the specified age range
// - Consider age-related preferences and restrictions when planning activities

// ### 5. ITINERARY LENGTH BASED ON DURATION
// - If hourRange < 3 hours: suggest only 2–3 locations, keep travel time short.
// - If 3 ≤ hourRange < 6 hours: suggest 4–5 venues, balanced pacing.
// - If 6 ≤ hourRange ≤ 10 hours: suggest 5–7 venues including meals/rest stops.
// - If hourRange > 10 hours: suggest 7–9+ venues with a mix of food, activity, and rest.
// - Make sure pacing feels reasonable for a group of ${params.numberOfPeople}.



// ## OUTPUT FORMAT
// Respond ONLY with a JSON object following this exact structure:

// {
//   "routeDescription": "2-3 sentence overview of this route option",
//   "estimatedBudgetPerPerson": "numerical estimate in local currency",
//   "totalTravelTime": "estimated time spent in transit",
//   "itinerary": [
//     {
//       "sequence": 1,
//       "venueName": "exact name from location data", 
//       "address": "exact address from location data",
//       "arrivalTime": "suggested time (HH:MM format)",
//       "duration": "time to spend here (in minutes)",
//       "description": "why this venue was chosen and what to do here",
//       "estimatedCost": "approximate cost per person",
//       "travelToNext": "estimated travel time to next location (minutes)",
//       "travelMethod": "recommended transportation method"
//     }
//   ],
//   "alternativeOptions": [
//     {
//       "venueName": "backup option from available data",
//       "reason": "why this could substitute if needed"
//     }
//   ],
//   "practicalTips": [
//     "specific advice for this route and group size"
//   ],
//           "conclusion": "I have created 3 different planned routes and you can edit each one. I can generate additional plans if needed."
// }

// ## CRITICAL INSTRUCTIONS
// 1. Use ONLY venues from the provided location data. Ensure you pay attention to cultural location types. For example, if the description says "We want to go to chinese restaurants", ensure to have only chinese restaurants in the list. You may analyze restaurant names to determine the type of restaurant.
// 2. Ensure total planned time does not exceed ${params.hourRange} hours
// 3. Verify venue names and addresses match the provided data exactly
// 4. Calculate realistic travel times between locations
// 5. Consider ${params.numberOfPeople} people for all logistics and costs
// 6. ${
//       params.budget
//         ? `**STAY WITHIN BUDGET**: Estimated costs must not exceed $${params.budget} per person`
//         : "Provide realistic cost estimates for budget planning"
//     }
// 7. ${
//       Array.isArray(params.ageRange) && params.ageRange[0] < 21
//         ? `**AGE RESTRICTION**: This group includes people under 21 - bars, night clubs, and alcohol-focused venues are STRICTLY PROHIBITED`
//         : "Consider age appropriateness for all venue selections"
//     }
// 8. Create a distinctive and enjoyable route that offers variety from other options
// 9. Include practical considerations like bathroom breaks, meal timing, etc.
// 10. If there are two locations with the same name, remove the location that is less popular. However, ensure that there's at least one location per location type. For example, if the categories are "restaurant" and "park", ensure each plan has at least one of each.
// 11. **NEVER include the same venue twice in the itinerary** - each venue must be unique within the plan
// 12. **Each venue name and address must be exactly as provided** - no variations or alternative names

// Begin analysis and create the JSON response now.`;

//     console.log("🤖 Calling Gemini API with improved prompt...");

//     const apiKey = process.env.GEMINI_API_KEY;
//     const response = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           systemInstruction: systemInstruction,
//           contents: [
//             {
//               role: "user",
//               parts: [{ text: eventPlanPrompt }],
//             },
//           ],
//           generationConfig: {
//             maxOutputTokens: 4000,
//             temperature: 0.3, // Reduced for more consistent, structured output
//             topP: 0.8,
//             responseMimeType: "application/json", // Force JSON output
//           },
//           safetySettings: [
//             {
//               category: "HARM_CATEGORY_DANGEROUS_CONTENT",
//               threshold: "BLOCK_NONE",
//             },
//             {
//               category: "HARM_CATEGORY_HARASSMENT",
//               threshold: "BLOCK_NONE",
//             },
//             {
//               category: "HARM_CATEGORY_HATE_SPEECH",
//               threshold: "BLOCK_NONE",
//             },
//             {
//               category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//               threshold: "BLOCK_NONE",
//             },
//           ],
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
//       return generateFallbackPlan(params);
//     }

//     const result = await response.json();
//     const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

//     if (!responseText) {
//       console.error("❌ Invalid Gemini API response format:", result);
//       return generateFallbackPlan(params);
//     }

//     // Parse and validate JSON response
//     try {
//       const parsedPlan = JSON.parse(responseText);
//       console.log("✅ Gemini API call successful - JSON parsed");

//       // Convert structured JSON back to text format for compatibility with existing code
//       return convertJsonPlanToText(parsedPlan);
//     } catch (parseError) {
//       console.error("❌ Failed to parse JSON response:", parseError);
//       console.log("Raw response:", responseText);
//       return generateFallbackPlan(params);
//     }
//   } catch (error) {
//     console.error("❌ Error in Gemini API call:", error);
//     return generateFallbackPlan(params);
//   }
// }

// // Helper function to convert structured JSON plan back to text format for compatibility
// function convertJsonPlanToText(parsedPlan: any): string {
//   try {
//     let textPlan = "";

//     // Add route description
//     if (parsedPlan.routeDescription) {
//       textPlan += parsedPlan.routeDescription + "\n\n";
//     }

//     // Add budget and travel info if available
//     if (parsedPlan.estimatedBudgetPerPerson || parsedPlan.totalTravelTime) {
//       textPlan += `Budget estimate: ${
//         parsedPlan.estimatedBudgetPerPerson || "Not specified"
//       } per person\n`;
//       textPlan += `Total travel time: ${
//         parsedPlan.totalTravelTime || "Not specified"
//       }\n\n`;
//     }

//     // Add itinerary with duplicate detection and removal
//     if (parsedPlan.itinerary && Array.isArray(parsedPlan.itinerary)) {
//       // Remove any duplicate venues from the itinerary as a safety check
//       const seenVenues = new Set<string>();
//       const uniqueItinerary = parsedPlan.itinerary.filter((item: any) => {
//         const venueKey = `${item.venueName || "Unknown"}-${
//           item.address || ""
//         }`.toLowerCase();
//         if (seenVenues.has(venueKey)) {
//           console.warn(
//             `🚨 Duplicate venue detected and removed from itinerary: ${item.venueName}`
//           );
//           return false;
//         }
//         seenVenues.add(venueKey);
//         return true;
//       });

//       uniqueItinerary.forEach((item: any, index: number) => {
//         textPlan += `${index + 1}. ${item.venueName || "Unknown Venue"}`;
//         if (item.address) {
//           textPlan += ` - ${item.address}`;
//         }
//         textPlan += "\n";

//         if (item.description) {
//           textPlan += `   ${item.description}\n`;
//         }

//         if (item.duration || item.estimatedCost) {
//           textPlan += `   Duration: ${
//             item.duration || "Not specified"
//           } minutes`;
//           if (item.estimatedCost) {
//             textPlan += ` | Cost: ${item.estimatedCost}`;
//           }
//           textPlan += "\n";
//         }

//         textPlan += "\n";
//       });

//       if (uniqueItinerary.length !== parsedPlan.itinerary.length) {
//         console.log(
//           `✅ Removed ${
//             parsedPlan.itinerary.length - uniqueItinerary.length
//           } duplicate venues from itinerary`
//         );
//       }
//     }

//     // Add practical tips if available
//     if (
//       parsedPlan.practicalTips &&
//       Array.isArray(parsedPlan.practicalTips) &&
//       parsedPlan.practicalTips.length > 0
//     ) {
//       textPlan += "Practical Tips:\n";
//       parsedPlan.practicalTips.forEach((tip: string) => {
//         textPlan += `- ${tip}\n`;
//       });
//       textPlan += "\n";
//     }

//     // Add conclusion
//     if (parsedPlan.conclusion) {
//       textPlan += parsedPlan.conclusion;
//     } else {
//       textPlan +=
//         "I have created 3 different planned routes and you can edit each one. I can generate additional plans if needed.";
//     }

//     return textPlan;
//   } catch (error) {
//     console.error("Error converting JSON plan to text:", error);
//     return "Plan generated successfully but formatting error occurred. Please try regenerating the plan.";
//   }
// }

// // Fallback function to generate a basic plan when GEMINI API is unavailable
// function generateFallbackPlan(params: {
//     // time
//     // high-priority present
//     // min-high-presence
//     // mid-priority present
//     // min-mid-presence
//     // low-priority present
//     // min-low-presence
//     // confidence score is the output by logic
//     // use all of these in the prompt to find best time suited for meeting
//     // 
//   places: any[];
//   hourRange: number;
//   numberOfPeople: number;
//   eventDescription: string;
//   startingLocation: any;
//   routeNumber: number;
//   totalRoutes: number;
//   budget?: number;
//   ageRange?: [number, number] | string;
// }): string {
//   console.log("🔄 Generating fallback event plan...");

//   const {
//     places,
//     hourRange,
//     numberOfPeople,
//     eventDescription,
//     routeNumber,
//     totalRoutes,
//     ageRange,
//   } = params;

//   const routeName = `Planned Route ${routeNumber}`;

//   // Group places by their actual types (dynamic, not hardcoded)
//   const placesByType: { [key: string]: any[] } = {};
//   places.forEach((place: any) => {
//     if (!placesByType[place.placeType]) {
//       placesByType[place.placeType] = [];
//     }
//     placesByType[place.placeType].push(place);
//   });

//   // Sort places within each type by rating
//   Object.keys(placesByType).forEach((type) => {
//     placesByType[type].sort(
//       (a: any, b: any) => (b.rating || 0) - (a.rating || 0)
//     );
//   });

//   const selectedPlaces: any[] = [];
//   const availableTypes = Object.keys(placesByType);

//   // Select best places from each type, considering event duration
//   if (hourRange >= 2 && availableTypes.length > 0) {
//     // For longer events, try to include variety from different types
//     const placesPerType = Math.max(
//       1,
//       Math.floor(Math.min(8, hourRange) / availableTypes.length)
//     );

//     availableTypes.forEach((type) => {
//       const topPlacesOfType = placesByType[type].slice(0, placesPerType);
//       selectedPlaces.push(...topPlacesOfType);
//     });
//   }

//   // If we don't have enough places or for shorter events, just take the highest rated overall
//   if (
//     selectedPlaces.length === 0 ||
//     selectedPlaces.length < Math.min(3, hourRange)
//   ) {
//     const allPlacesSorted = places.sort(
//       (a: any, b: any) => (b.rating || 0) - (a.rating || 0)
//     );
//     const additionalPlaces = allPlacesSorted
//       .filter((p: any) => !selectedPlaces.find((sp: any) => sp.id === p.id))
//       .slice(0, Math.max(3, Math.min(8, hourRange)) - selectedPlaces.length);
//     selectedPlaces.push(...additionalPlaces);
//   }

//   // Limit to reasonable number of places based on time available
//   const finalPlaces = selectedPlaces.slice(
//     0,
//     Math.min(8, Math.max(2, hourRange))
//   );

//   return `Here's your ${hourRange}-hour ${
//     eventDescription || "event"
//   } plan for ${numberOfPeople} people${
//     ageRange
//       ? ` (age range: ${
//           Array.isArray(ageRange)
//             ? `${ageRange[0]} to ${ageRange[1]}`
//             : ageRange
//         })`
//       : ""
//   }${
//     params.budget ? ` with a $${params.budget} per person budget` : ""
//   }. This plan includes the best-rated venues in your area, organized for optimal travel flow. Each location has been selected based on its ratings and suitability for your group.${
//     ageRange && Array.isArray(ageRange) && ageRange[0] < 21
//       ? " All venues are age-appropriate and do not include bars or night clubs."
//       : ""
//   }

// ${
//   params.budget
//     ? `Budget Overview: With $${
//         params.budget
//       } per person budget, that's a total of $${
//         params.budget * numberOfPeople
//       } for your group of ${numberOfPeople} people for this ${hourRange}-hour experience.

// `
//     : ""
// }${finalPlaces
//     .map(
//       (place: any, index: number) => `${index + 1}. ${
//         place.displayName || place.name
//       } - ${place.formattedAddress || place.address || "Address not available"}
//    ${
//      place.rating
//        ? `Highly rated venue (${place.rating} stars) perfect for ${place.placeType} activities`
//        : `Selected ${place.placeType} venue based on location and type`
//    }
//    Estimated time: ${Math.floor(
//      hourRange / Math.max(finalPlaces.length, 1)
//    )} hour(s)

// `
//     )
//     .join("")}You can choose to edit your plan or make another one!`;
// }

// async function selectPlaceTypesWithGemini(
//   eventDescription: string
// ): Promise<string[]> {
//   console.log(`🤖 Selecting place types for event: "${eventDescription}"`);

//   if (!process.env.GEMINI_API_KEY) {
//     console.warn("⚠️ GEMINI_API_KEY not found, using default place types");
//     return ["restaurant", "park", "tourist_attraction"];
//   }

//   if (!eventDescription || eventDescription.trim().length === 0) {
//     console.warn("⚠️ Empty event description, using default place types");
//     return ["restaurant", "park", "tourist_attraction"];
//   }

//   const prompt = `
// You are an expert event planner. Analyze this event description and select the most relevant place types.

// EVENT DESCRIPTION: "${eventDescription}"

// AVAILABLE PLACE TYPES:
// ${AVAILABLE_PLACE_TYPES.join(", ")}

// SELECTION RULES:
// 1. Choose 1–5 place types that best match the event theme and activities. If the description says "Only", ensure to have only those place types referred to by the user. For example, if the description says "Only museums", ensure to have only museums in the list. If the description insinuates
//  they want one type of location, ensure you output only those location types. For example, if the description says "We want to go to multiple night clubs", ensure to have only night clubs in the list.
// 2. Strongly consider the budget level when selecting place types:
//    - If budget is below $25 per person, prioritize budget-friendly types (e.g., "cafe", "park", "convenience_store", "supermarket", "museum", "free attractions").
//    - If budget is between $25–75 per person, include moderately priced types (e.g., "restaurant", "movie_theater", "amusement_park").
//    - If budget is above $75 per person, allow for premium types (e.g., "art_gallery", "fine dining", "spa", "tourist_attraction", "stadium", "zoo").
// 3. Avoid expensive categories like "casino", "night_club", or "bar" for low-budget events.
// 4. Avoid adult-only types if event includes minors.
// 5. Return ONLY a JSON array of valid Google Place types (no explanations).

// Return ONLY a JSON array, e.g.: ["restaurant", "park", "museum"]
// `;

//   try {
//     const apiKey = process.env.GEMINI_API_KEY;
//     console.log("🔄 Calling Gemini API for place type selection...");

//     const response = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           contents: [
//             {
//               role: "user",
//               parts: [{ text: prompt }],
//             },
//           ],
//           generationConfig: {
//             maxOutputTokens: 100,
//             temperature: 0.3, // Lower temperature for more consistent results
//           },
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error(
//         `❌ Gemini API error for place types: ${response.status} - ${errorText}`
//       );
//       throw new Error(`Gemini place type selection failed: ${response.status}`);
//     }

//     const result = await response.json();
//     const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

//     let selectedTypes: string[];
//     try {
//       // Handle markdown-wrapped JSON responses
//       let jsonText = rawText.trim();

//       // Remove markdown code block markers if present
//       if (jsonText.startsWith("```json")) {
//         jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
//       } else if (jsonText.startsWith("```")) {
//         jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
//       }

//       console.log("🔍 Extracted JSON text for parsing:", jsonText);

//       const parsed = JSON.parse(jsonText);
//       // Validate that it's an array of strings
//       if (
//         Array.isArray(parsed) &&
//         parsed.every((item) => typeof item === "string")
//       ) {
//         selectedTypes = parsed;
//         console.log(
//           "✅ Successfully parsed Gemini place types:",
//           selectedTypes
//         );
//       } else {
//         console.warn(
//           "Gemini returned invalid format for place types:",
//           rawText
//         );
//         selectedTypes = ["tourist_attraction", "park", "museum"]; // Fallback to generic types
//       }
//     } catch (e) {
//       console.warn("Gemini returned non-JSON output for place types:", rawText);
//       console.warn("JSON parsing error:", e);
//       selectedTypes = ["tourist_attraction", "park", "museum"]; // Fallback to generic types
//     }

//     // Validate and filter selected types
//     const validSelectedTypes = selectedTypes.filter((type) =>
//       AVAILABLE_PLACE_TYPES.includes(type)
//     );

//     if (validSelectedTypes.length === 0) {
//       console.warn("No valid place types selected by Gemini, using defaults");
//       return ["tourist_attraction", "park", "museum"];
//     }

//     // Ensure we only have up to 5 unique types
//     const uniqueSelectedTypes = Array.from(new Set(validSelectedTypes));
//     if (uniqueSelectedTypes.length > 5) {
//       console.warn(
//         `Gemini selected more than 5 types, truncating to 5: ${uniqueSelectedTypes
//           .slice(0, 5)
//           .join(", ")}`
//       );
//       return uniqueSelectedTypes.slice(0, 5);
//     }

//     console.log(
//       `✅ Gemini selected ${
//         uniqueSelectedTypes.length
//       } valid place types: ${uniqueSelectedTypes.join(", ")}`
//     );

//     // Enhanced logging with category breakdown
//     console.log(
//       "🎯 ═══════════════════════════════════════════════════════════"
//     );
//     console.log(`🎯 GEMINI PLACE TYPE SELECTION RESULTS`);
//     console.log(
//       "🎯 ═══════════════════════════════════════════════════════════"
//     );
//     console.log(`📝 Event Description: "${eventDescription}"`);
//     console.log(`🎯 Selected Categories (${uniqueSelectedTypes.length}):`);
//     uniqueSelectedTypes.forEach((type, index) => {
//       console.log(`   ${index + 1}. ${type.toUpperCase()}`);
//     });
//     console.log(
//       "🎯 ═══════════════════════════════════════════════════════════"
//     );

//     return uniqueSelectedTypes;
//   } catch (error) {
//     console.error("❌ Error in place type selection:", error);
//     return ["restaurant", "park", "tourist_attraction"];
//   }
// }
