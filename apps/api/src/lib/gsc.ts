import { google } from "googleapis";
import { format, subDays } from "date-fns";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FRONTEND_URL}/auth/google/callback`
);

export function getAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getGscData(credentials: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}, propertyUrl: string, daysBack = 28) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(credentials);

  const searchConsole = google.searchconsole({ version: "v1", auth });

  const dateTo = format(new Date(), "yyyy-MM-dd");
  const dateFrom = format(subDays(new Date(), daysBack), "yyyy-MM-dd");

  const [summary, pages, queries] = await Promise.all([
    searchConsole.searchanalytics.query({
      siteUrl: propertyUrl,
      requestBody: {
        startDate: dateFrom,
        endDate: dateTo,
        dimensions: [],
      },
    }),

    searchConsole.searchanalytics.query({
      siteUrl: propertyUrl,
      requestBody: {
        startDate: dateFrom,
        endDate: dateTo,
        dimensions: ["page"],
        rowLimit: 50,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      },
    }),

    searchConsole.searchanalytics.query({
      siteUrl: propertyUrl,
      requestBody: {
        startDate: dateFrom,
        endDate: dateTo,
        dimensions: ["query"],
        rowLimit: 50,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      },
    }),
  ]);

  return {
    summary: summary.data.rows?.[0] ?? null,
    pages: pages.data.rows ?? [],
    queries: queries.data.rows ?? [],
    dateFrom,
    dateTo,
  };
}

export async function getGscDailyData(credentials: any, propertyUrl: string, daysBack = 90) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(credentials);

  const searchConsole = google.searchconsole({ version: "v1", auth });

  const dateTo = format(new Date(), "yyyy-MM-dd");
  const dateFrom = format(subDays(new Date(), daysBack), "yyyy-MM-dd");

  const { data } = await searchConsole.searchanalytics.query({
    siteUrl: propertyUrl,
    requestBody: {
      startDate: dateFrom,
      endDate: dateTo,
      dimensions: ["date"],
      rowLimit: 500,
    },
  });

  return data.rows ?? [];
}
