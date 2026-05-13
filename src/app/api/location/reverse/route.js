import { reverseGeocodeWithProvider } from "@/lib/reverse-geocode";
import { createJsonErrorResponse } from "@/lib/http";

export async function GET(request) {
  let { searchParams } = new URL(request.url);
  let lat = Number(searchParams.get("lat"));
  let lng = Number(searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ message: "Latitude and longitude are required." }, { status: 400 });
  }

  try {
    let location = await reverseGeocodeWithProvider(lat, lng);

    return Response.json({
      location,
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to identify the selected location.", 400);
  }
}
