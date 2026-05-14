import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../stores";
import { setCurrency, setFavicon } from "../lib/utils";
import { setAppLanguage, useT } from "../i18n";
import { useState, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const CURRENCY_NAMES: Record<string, string> = {
  IDR: "Indonesian Rupiah",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  SGD: "Singapore Dollar",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  PHP: "Philippine Peso",
  VND: "Vietnamese Dong",
  KRW: "South Korean Won",
  INR: "Indian Rupee",
  AUD: "Australian Dollar",
  NZD: "New Zealand Dollar",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
  SAR: "Saudi Riyal",
  AED: "UAE Dirham",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  RUB: "Russian Ruble",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  ZAR: "South African Rand",
  TRY: "Turkish Lira",
  HKD: "Hong Kong Dollar",
  TWD: "Taiwan Dollar",
  PLN: "Polish Zloty",
  ILS: "Israeli Shekel",
  ARS: "Argentine Peso",
  CLP: "Chilean Peso",
  COP: "Colombian Peso",
  EGP: "Egyptian Pound",
  KES: "Kenyan Shilling",
  NGN: "Nigerian Naira",
  PKR: "Pakistani Rupee",
  LKR: "Sri Lankan Rupee",
  BDT: "Bangladeshi Taka",
  MMK: "Myanmar Kyat",
  KHR: "Cambodian Riel",
  LAK: "Lao Kip",
  NPR: "Nepalese Rupee",
  BND: "Brunei Dollar",
  AFN: "Afghan Afghani",
  AMD: "Armenian Dram",
  AZN: "Azerbaijani Manat",
  BHD: "Bahraini Dinar",
  BIF: "Burundian Franc",
  BOB: "Bolivian Boliviano",
  BWP: "Botswana Pula",
  BYN: "Belarusian Ruble",
  CDF: "Congolese Franc",
  CRC: "Costa Rican Colon",
  CZK: "Czech Koruna",
  DJF: "Djiboutian Franc",
  DOP: "Dominican Peso",
  DZD: "Algerian Dinar",
  ETB: "Ethiopian Birr",
  GHS: "Ghanaian Cedi",
  GMD: "Gambian Dalasi",
  GNF: "Guinean Franc",
  HUF: "Hungarian Forint",
  IQD: "Iraqi Dinar",
  IRR: "Iranian Rial",
  ISK: "Icelandic Krona",
  JMD: "Jamaican Dollar",
  JOD: "Jordanian Dinar",
  KGS: "Kyrgyzstani Som",
  KMF: "Comorian Franc",
  KWD: "Kuwaiti Dinar",
  KZT: "Kazakhstani Tenge",
  LBP: "Lebanese Pound",
  LYD: "Libyan Dinar",
  MAD: "Moroccan Dirham",
  MDL: "Moldovan Leu",
  MGA: "Malagasy Ariary",
  MKD: "Macedonian Denar",
  MNT: "Mongolian Tugrik",
  MOP: "Macanese Pataca",
  MRU: "Mauritanian Ouguiya",
  MUR: "Mauritian Rupee",
  MVR: "Maldivian Rufiyaa",
  MWK: "Malawian Kwacha",
  MZN: "Mozambican Metical",
  NAD: "Namibian Dollar",
  NIO: "Nicaraguan Cordoba",
  OMR: "Omani Rial",
  PAB: "Panamanian Balboa",
  PEN: "Peruvian Sol",
  PGK: "Papua New Guinean Kina",
  PYG: "Paraguayan Guarani",
  QAR: "Qatari Riyal",
  RON: "Romanian Leu",
  RWF: "Rwandan Franc",
  SBD: "Solomon Islands Dollar",
  SCR: "Seychellois Rupee",
  SDG: "Sudanese Pound",
  SLL: "Sierra Leonean Leone",
  SOS: "Somali Shilling",
  SRD: "Surinamese Dollar",
  SSP: "South Sudanese Pound",
  STN: "Sao Tome Dobra",
  SVC: "Salvadoran Colon",
  SYP: "Syrian Pound",
  SZL: "Swazi Lilangeni",
  TJS: "Tajikistani Somoni",
  TMT: "Turkmenistani Manat",
  TND: "Tunisian Dinar",
  TOP: "Tongan Pa'anga",
  TTD: "Trinidad Dollar",
  TZS: "Tanzanian Shilling",
  UAH: "Ukrainian Hryvnia",
  UGX: "Ugandan Shilling",
  UYU: "Uruguayan Peso",
  UZS: "Uzbekistani Som",
  VES: "Venezuelan Bolivar",
  WST: "Samoan Tala",
  XAF: "CFA Franc BEAC",
  XCD: "East Caribbean Dollar",
  XOF: "CFA Franc BCEAO",
  XPF: "CFP Franc",
  YER: "Yemeni Rial",
  ZMW: "Zambian Kwacha",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { tenant, setTenant } = useAuthStore();
  const t = useT();

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ["settings-company"],
    queryFn: () => api.get<any>("/settings/company"),
  });

  const { data: currenciesData } = useQuery({
    queryKey: ["currencies"],
    queryFn: () =>
      fetch(
        "https://api.currencyapi.com/v3/latest?apikey=cur_live_NaV9teg6a70cnHWfpWKqdoj5LSWTtpkrvO7rZQ2W",
      ).then((r) => r.json()),
    staleTime: 1000 * 60 * 60,
  });

  const currencies = currenciesData?.data
    ? Object.keys(currenciesData.data).sort()
    : [];

  const company = companyData?.data;

  const [companyForm, setCompanyForm] = useState({
    name: "",
    currency: "",
    currency_symbol: "",
    language: "",
    timezone: "",
    date_format: "",
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);



  const companyMutation = useMutation({
    mutationFn: (data: typeof companyForm) =>
      api.put<any>("/settings/company", data),
    onSuccess: (res) => {
      const tenantData = res.data;
      setCurrency(
        tenantData.currency,
        tenantData.language === "id" ? "id-ID" : "en-US",
      );
      setTenant({
        name: tenantData.name,
        logo: tenantData.logo ?? null,
        favicon: tenantData.favicon ?? null,
        currency: tenantData.currency,
        currency_symbol: tenantData.currency_symbol,
        timezone: tenantData.timezone,
        language: tenantData.language,
        date_format: tenantData.date_format,
      });
      if (tenantData.language === "id" || tenantData.language === "en") {
        setAppLanguage(tenantData.language);
      }
      queryClient.invalidateQueries({ queryKey: ["settings-company"] });
      toast.success(t("settings.company.success"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
          "X-Tenant-ID": "1",
          "X-Branch-ID": localStorage.getItem("selectedBranchId") || "1",
        },
        body: form,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload logo gagal");
      }
      setTenant({ ...tenant!, logo: json.data.logo });
      queryClient.invalidateQueries({ queryKey: ["settings-company"] });
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      const form = new FormData();
      form.append("favicon", file);
      const res = await fetch("/api/settings/favicon", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
          "X-Tenant-ID": "1",
          "X-Branch-ID": localStorage.getItem("selectedBranchId") || "1",
        },
        body: form,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload favicon gagal");
      }
      setTenant({ ...tenant!, favicon: json.data.favicon });
      setFavicon(json.data.favicon);
      queryClient.invalidateQueries({ queryKey: ["settings-company"] });
      toast.success("Favicon uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFaviconUploading(false);
    }
  };

  useEffect(() => {
    if (company)
      setCompanyForm({
        name: company.name || "",
        currency: company.currency || "",
        currency_symbol: company.currency_symbol || company.currency || "",
        language: company.language || "",
        timezone: "Asia/Jakarta",
        date_format: company.date_format || "",
      });
  }, [company]);

  const resetCompany = () => {
    if (company)
      setCompanyForm({
        name: company.name || "",
        currency: company.currency || "",
        currency_symbol: company.currency_symbol || company.currency || "",
        language: company.language || "",
        timezone: "Asia/Jakarta",
        date_format: company.date_format || "",
      });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("settings.title")}</h1>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        {companyLoading ? (
          <div
            className="skeleton"
            style={{ height: "12rem", borderRadius: "8px" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.125rem",
              maxWidth: "32rem",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: ".5rem",
              }}
            >
              {tenant?.logo ? (
                <img
                  src={tenant.logo}
                  alt=""
                  style={{
                    width: "4rem",
                    height: "4rem",
                    borderRadius: "10px",
                    objectFit: "contain",
                    border: "1px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "4rem",
                    height: "4rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{ fontSize: ".75rem", color: "var(--text-muted)" }}
                  >
                    {t("settings.company.logo")}
                  </span>
                </div>
              )}
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                {logoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {t("settings.company.uploadLogo")}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
              </label>
            </div>

            {/* Favicon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: ".5rem",
              }}
            >
              {tenant?.favicon ? (
                <img
                  src={tenant.favicon}
                  alt=""
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "4px",
                    objectFit: "contain",
                    border: "1px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{ fontSize: ".6rem", color: "var(--text-muted)" }}
                  >
                    ICO
                  </span>
                </div>
              )}
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                {faviconUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {t("settings.company.uploadFavicon")}
                <input
                  type="file"
                  accept="image/*,.ico,.svg"
                  style={{ display: "none" }}
                  onChange={handleFaviconUpload}
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">{t("settings.company.name")}</label>
              <input
                value={companyForm.name}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, name: e.target.value })
                }
                className="form-input"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: ".75rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">
                  {t("settings.company.currency")}
                </label>
                <select
                  value={companyForm.currency}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCompanyForm({ ...companyForm, currency: code, currency_symbol: code || companyForm.currency_symbol });
                  }}
                  className="form-input"
                >
                  <option value="">--</option>
                  {currencies.map((code) => (
                    <option key={code} value={code}>
                      {CURRENCY_NAMES[code] ?? code} ({code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("settings.company.currencySymbol")}
                </label>
                <input
                  value={companyForm.currency_symbol}
                  readOnly
                  className="form-input"
                  style={{ color: "var(--text-muted)", cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: ".75rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">
                  {t("settings.company.language")}
                </label>
                <select
                  value={companyForm.language}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, language: e.target.value })
                  }
                  className="form-input"
                >
                  <option value="id">{t("settings.company.languageId")}</option>
                  <option value="en">{t("settings.company.languageEn")}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("settings.company.timezone")}
                </label>
                <input
                  value={companyForm.timezone || "Asia/Jakarta"}
                  disabled
                  className="form-input"
                  style={{ color: "var(--text-muted)", cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {t("settings.company.dateFormat")}
              </label>
              <select
                value={companyForm.date_format}
                onChange={(e) =>
                  setCompanyForm({
                    ...companyForm,
                    date_format: e.target.value,
                  })
                }
                className="form-input"
              >
                <option value="d/m/Y">14/05/2026</option>
                <option value="d-m-Y">14-05-2026</option>
                <option value="d F Y">14 Mei 2026</option>
                <option value="Y-m-d">2026-05-14</option>
                <option value="m/d/Y">05/14/2026</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: ".5rem", marginTop: ".25rem" }}>
              <button
                onClick={() => companyMutation.mutate(companyForm)}
                disabled={companyMutation.isPending}
                className="btn btn-primary"
              >
                {companyMutation.isPending
                  ? t("common.saving")
                  : t("settings.company.save")}
              </button>
              <button onClick={resetCompany} className="btn btn-ghost">
                {t("common.reset")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
