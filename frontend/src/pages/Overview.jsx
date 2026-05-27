import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie,
} from 'recharts';
import {
  Bot, Building2, Crown, Download, Filter, Globe, Megaphone, ShieldCheck,
  PoundSterling, Target, Trophy, Users,
} from 'lucide-react';
import {
  useMetricsByBusiness, useMetricsSummary, useTrend, useCampaigns,
} from '../hooks/useApi.js';

const PROVIDER_LABEL = { meta: 'Meta Ads', google: 'Google Ads' };

// --- MOCK SHADCN/UI COMPONENTS (ported from test.html) ---
const Card = ({ className = '', ...props }) => (
  <div className={`rounded-2xl border border-[#eadfca] bg-white shadow-sm ${className}`} {...props} />
);

const CardContent = ({ className = '', ...props }) => (
  <div className={`p-5 ${className}`} {...props} />
);

const Button = ({ className = '', variant = 'default', ...props }) => {
  const base = "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2";
  const variants = {
    default: "bg-[#d19a15] text-white hover:bg-[#b98510]",
    outline: "border border-[#eadfca] text-[#4c4c4c] bg-white hover:bg-[#f7efdf]",
  };
  return <button className={`${base} ${variants[variant] || variants.default} ${className}`} {...props} />;
};

const Badge = ({ className = '', variant = 'default', ...props }) => {
  const variants = {
    default: "bg-[#f7efdf] text-[#8a650f]",
    outline: "border border-[#d19a15]/40 text-[#8a650f]",
  };
  return (
    <span className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-semibold ${variants[variant] || variants.default} ${className}`} {...props} />
  );
};

// --- MOCK SELECT COMPONENT ---
const Select = ({ value, onValueChange, children }) => {
  const trigger = React.Children.toArray(children).find((c) => c.type === SelectTrigger);
  const content = React.Children.toArray(children).find((c) => c.type === SelectContent);

  const triggerClassName = trigger ? trigger.props.className : '';
  const widthClass = triggerClassName.split(' ').find((c) => c.startsWith('w-')) || '';
  const otherClasses = triggerClassName.split(' ').filter((c) => !c.startsWith('w-')).join(' ');

  return (
    <div className={`relative inline-block ${widthClass}`}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`w-full appearance-none rounded-2xl border border-[#eadfca] bg-white px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#d19a15]/30 h-10 cursor-pointer ${otherClasses}`}
      >
        {content ? content.props.children : null}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#4c4c4c]">
        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
const SelectTrigger = ({ children }) => children;
const SelectValue = () => null;
const SelectContent = ({ children }) => children;
const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;

// --- MOCK TABS COMPONENTS ---
const TabsContext = React.createContext({ activeTab: '', setActiveTab: () => {} });

const Tabs = ({ defaultValue, className = '', children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className = '', children }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-2xl bg-[#f7efdf] p-1 text-muted-foreground ${className}`}>{children}</div>
);

const TabsTrigger = ({ value, className = '', children }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-white text-[#4c4c4c] shadow-sm' : 'text-[#758299] hover:text-[#4c4c4c]'
      } ${className}`}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className = '', children }) => {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>{children}</div>;
};

function currency(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

function decimalCurrency(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
}

const StatCard = ({ title, value, subtitle, icon: Icon }) => (
  <Card className="rounded-2xl shadow-sm border-[#eadfca] bg-white hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6f6f6f]">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#4c4c4c]">{value}</h3>
          <p className="mt-1 text-xs text-[#8a8a8a]">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-[#f7efdf] p-3 text-[#d19a15]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ALL = 'All Businesses';
const EMPTY_CAMPAIGN = { campaign: '—', business: '—', platform: '—', leads: 0, cpl: 0, spend: 0 };

export default function Overview() {
  const [selectedBusiness, setSelectedBusiness] = useState(ALL);
  const [period, setPeriod] = useState('This Month');

  const byBusinessQ = useMetricsByBusiness();
  const summaryQ = useMetricsSummary();
  const trendQ = useTrend();
  const campaignsQ = useCampaigns();

  const isLoading = byBusinessQ.isLoading || campaignsQ.isLoading;
  const error = byBusinessQ.error || summaryQ.error || trendQ.error || campaignsQ.error;

  // Business filter dropdown: "All Businesses" + every business name we have data for.
  const businesses = useMemo(
    () => [ALL, ...(byBusinessQ.data || []).map((b) => b.name)],
    [byBusinessQ.data]
  );

  // Per-business rows for the comparison table + stat-card totals. Website/chatbot
  // leads have no backend source yet, so they read 0 (honest, not faked).
  const businessData = useMemo(() => {
    const rows = (byBusinessQ.data || []).map((b) => ({
      name: b.name,
      google: b.google_spend || 0,
      meta: b.meta_spend || 0,
      leads: b.conversions || 0,
      website: 0,
      chatbot: 0,
      cpl: b.conversions > 0 ? b.spend / b.conversions : 0,
      status: '—',
    }));
    return selectedBusiness === ALL ? rows : rows.filter((r) => r.name === selectedBusiness);
  }, [byBusinessQ.data, selectedBusiness]);

  // Per-campaign rows, filtered to the selected business.
  const campaignData = useMemo(() => {
    const rows = (campaignsQ.data || []).map((c) => ({
      business: c.business,
      platform: PROVIDER_LABEL[c.provider] || c.provider,
      campaign: c.campaign,
      spend: c.spend || 0,
      clicks: c.clicks || 0,
      leads: c.conversions || 0,
      cpl: c.conversions > 0 ? c.spend / c.conversions : 0,
      conversions: c.conversions || 0,
    }));
    return selectedBusiness === ALL ? rows : rows.filter((r) => r.business === selectedBusiness);
  }, [campaignsQ.data, selectedBusiness]);

  // Monthly trend (org-wide). UI plots spend + leads(=conversions).
  const trendData = useMemo(
    () => (trendQ.data || []).map((p) => ({ month: p.month, spend: p.spend || 0, leads: p.conversions || 0 })),
    [trendQ.data]
  );

  // Lead source mix from provider conversions (org-wide). Website/chatbot = 0.
  const sourceData = useMemo(() => {
    const byProvider = summaryQ.data?.byProvider || [];
    const conv = (p) => byProvider.find((x) => x.provider === p)?.conversions || 0;
    return [
      { name: 'Google Ads', value: conv('google'), fill: '#d19a15' },
      { name: 'Meta Ads', value: conv('meta'), fill: '#4c4c4c' },
      { name: 'Website Forms', value: 0, fill: '#b7a77a' },
      { name: 'Chatbot', value: 0, fill: '#e8d7ae' },
    ];
  }, [summaryQ.data]);

  const totals = useMemo(() => {
    const spend = businessData.reduce((sum, item) => sum + item.google + item.meta, 0);
    const leads = businessData.reduce((sum, item) => sum + item.leads, 0);
    const website = businessData.reduce((sum, item) => sum + item.website, 0);
    const chatbot = businessData.reduce((sum, item) => sum + item.chatbot, 0);
    const bestCampaign = [...campaignData].sort((a, b) => b.leads - a.leads)[0] || EMPTY_CAMPAIGN;
    return { spend, leads, website, chatbot, cpl: leads ? spend / leads : 0, bestCampaign };
  }, [businessData, campaignData]);

  if (error) {
    return (
      <div className="gm-dashboard bg-[#faf9f6] text-[#4c4c4c] p-8">
        <p className="text-sm text-red-600">Failed to load dashboard: {error.message}. Is the API running on :4000?</p>
      </div>
    );
  }

  return (
    <div className="gm-dashboard bg-[#faf9f6] text-[#4c4c4c]">
      <header className="sticky top-0 z-20 border-b border-[#eadfca] bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-[#4c4c4c]">GM Dashboard</h2>
            <p className="text-sm text-[#777] mt-1">Light, owner-level marketing dashboard across GM practices, Fixed Teeth, Warwick Lodge and Plan 4 Growth Academy.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-nowrap">
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger className="w-[260px] rounded-2xl bg-white border-[#eadfca]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((business) => <SelectItem key={business} value={business}>{business}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] rounded-2xl bg-white border-[#eadfca]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Today', 'Last 7 Days', 'This Month', 'Last Month', 'Custom Range'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="rounded-2xl gap-2 bg-[#d19a15] text-white hover:bg-[#b98510] flex-shrink-0">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </header>

      <section className="space-y-6 p-5 lg:p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total Marketing Spend" value={currency(totals.spend)} subtitle="Combined ad spend" icon={PoundSterling} />
          <StatCard title="Google Ads Spend" value={currency(businessData.reduce((sum, item) => sum + item.google, 0))} subtitle="Search + display campaigns" icon={Globe} />
          <StatCard title="Facebook / Meta Spend" value={currency(businessData.reduce((sum, item) => sum + item.meta, 0))} subtitle="Facebook & Instagram campaigns" icon={Megaphone} />
          <StatCard title="Total Leads" value={totals.leads} subtitle="Paid, website and chatbot" icon={Users} />
          <StatCard title="Average CPL" value={decimalCurrency(totals.cpl)} subtitle="Across all businesses" icon={Target} />
        </div>

        <Card className="rounded-2xl shadow-sm border-[#eadfca] bg-white">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#f7efdf] p-3 text-[#d19a15]">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#8a650f]">Highest Result Campaign</p>
                  <h3 className="mt-1 text-xl font-semibold text-[#4c4c4c]">{totals.bestCampaign.campaign}</h3>
                  <p className="mt-1 text-sm text-[#777]">{totals.bestCampaign.business} • {totals.bestCampaign.platform}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-[#faf6ed] px-5 py-3">
                  <p className="text-xs text-[#777]">Leads</p>
                  <p className="text-lg font-semibold text-[#4c4c4c]">{totals.bestCampaign.leads}</p>
                </div>
                <div className="rounded-2xl bg-[#faf6ed] px-5 py-3">
                  <p className="text-xs text-[#777]">CPL</p>
                  <p className="text-lg font-semibold text-[#4c4c4c]">{decimalCurrency(totals.bestCampaign.cpl)}</p>
                </div>
                <div className="rounded-2xl bg-[#faf6ed] px-5 py-3">
                  <p className="text-xs text-[#777]">Spend</p>
                  <p className="text-lg font-semibold text-[#4c4c4c]">{currency(totals.bestCampaign.spend)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <StatCard title="Website Leads" value={totals.website} subtitle="Website enquiry submissions" icon={Globe} />
          <StatCard title="Chatbot Leads" value={totals.chatbot} subtitle="Chatbot-generated enquiries" icon={Bot} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl shadow-sm border-[#eadfca] xl:col-span-2">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#4c4c4c]">Spend vs Leads Trend</h3>
                  <p className="text-sm text-[#777]">Monthly trend for owner review.</p>
                </div>
                <Badge className="rounded-xl bg-[#f7efdf] text-[#8a650f] hover:bg-[#f7efdf]">{isLoading ? 'Loading…' : 'Live'}</Badge>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eadfca" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="spend" stroke="#d19a15" strokeWidth={3} />
                    <Line type="monotone" dataKey="leads" stroke="#4c4c4c" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-[#eadfca]">
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold text-[#4c4c4c]">Lead Source Mix</h3>
              <p className="text-sm text-[#777]">Where enquiries are coming from.</p>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={95} label />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="businesses" className="space-y-4">
          <TabsList className="rounded-2xl bg-[#f7efdf] p-1">
            <TabsTrigger value="businesses" className="rounded-xl">Business Performance</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-xl">Campaign Performance</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl">User Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="businesses">
            <Card className="rounded-2xl shadow-sm border-[#eadfca]">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-[#eadfca] p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-[#4c4c4c]">Business Comparison</h3>
                    <p className="text-sm text-[#777]">Compare spend, leads and cost per lead.</p>
                  </div>
                  <Button variant="outline" className="rounded-2xl gap-2 border-[#d19a15]/40 text-[#8a650f]">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#faf6ed] text-xs uppercase text-[#777]">
                      <tr>
                        <th className="px-5 py-3">Business</th>
                        <th className="px-5 py-3">Google Spend</th>
                        <th className="px-5 py-3">Meta Spend</th>
                        <th className="px-5 py-3">Total Spend</th>
                        <th className="px-5 py-3">Leads</th>
                        <th className="px-5 py-3">Website</th>
                        <th className="px-5 py-3">Chatbot</th>
                        <th className="px-5 py-3">CPL</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e7d7]">
                      {businessData.map((item) => (
                        <tr key={item.name} className="hover:bg-[#faf6ed]">
                          <td className="px-5 py-4 font-medium">{item.name}</td>
                          <td className="px-5 py-4">{currency(item.google)}</td>
                          <td className="px-5 py-4">{currency(item.meta)}</td>
                          <td className="px-5 py-4 font-semibold">{currency(item.google + item.meta)}</td>
                          <td className="px-5 py-4">{item.leads}</td>
                          <td className="px-5 py-4">{item.website}</td>
                          <td className="px-5 py-4">{item.chatbot}</td>
                          <td className="px-5 py-4 font-semibold">{decimalCurrency(item.cpl)}</td>
                          <td className="px-5 py-4"><Badge variant="outline" className="rounded-xl border-[#d19a15]/40 text-[#8a650f]">{item.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card className="rounded-2xl shadow-sm border-[#eadfca]">
              <CardContent className="p-0">
                <div className="border-b border-[#eadfca] p-5">
                  <h3 className="text-lg font-semibold text-[#4c4c4c]">Campaign Performance</h3>
                  <p className="text-sm text-[#777]">Campaign-level spend, clicks, leads and CPL.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#faf6ed] text-xs uppercase text-[#777]">
                      <tr>
                        <th className="px-5 py-3">Business</th>
                        <th className="px-5 py-3">Platform</th>
                        <th className="px-5 py-3">Campaign</th>
                        <th className="px-5 py-3">Spend</th>
                        <th className="px-5 py-3">Clicks</th>
                        <th className="px-5 py-3">Leads</th>
                        <th className="px-5 py-3">CPL</th>
                        <th className="px-5 py-3">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e7d7]">
                      {campaignData.map((item) => (
                        <tr key={`${item.business}-${item.campaign}`} className="hover:bg-[#faf6ed]">
                          <td className="px-5 py-4 font-medium">{item.business}</td>
                          <td className="px-5 py-4">{item.platform}</td>
                          <td className="px-5 py-4">{item.campaign}</td>
                          <td className="px-5 py-4">{currency(item.spend)}</td>
                          <td className="px-5 py-4">{item.clicks}</td>
                          <td className="px-5 py-4">{item.leads}</td>
                          <td className="px-5 py-4 font-semibold">{decimalCurrency(item.cpl)}</td>
                          <td className="px-5 py-4">{item.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="rounded-2xl shadow-sm border-[#eadfca]">
              <CardContent className="p-0">
                <div className="border-b border-[#eadfca] p-5">
                  <h3 className="text-lg font-semibold text-[#4c4c4c]">User Access Structure</h3>
                  <p className="text-sm text-[#777]">Super admins can manage users. Practice managers see assigned practice data only. Conversion managers can feed lead conversion data.</p>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#eadfca] bg-[#faf6ed] p-5">
                    <Crown className="mb-3 h-5 w-5 text-[#d19a15]" />
                    <h4 className="font-semibold text-[#4c4c4c]">Super Admin</h4>
                    <p className="mt-2 text-sm text-[#777]">Full access to all businesses, integrations, reporting, users and exports.</p>
                  </div>
                  <div className="rounded-2xl border border-[#eadfca] bg-white p-5">
                    <Building2 className="mb-3 h-5 w-5 text-[#d19a15]" />
                    <h4 className="font-semibold text-[#4c4c4c]">Practice Manager</h4>
                    <p className="mt-2 text-sm text-[#777]">Can view assigned practice performance, spend, leads and campaign results.</p>
                  </div>
                  <div className="rounded-2xl border border-[#eadfca] bg-white p-5">
                    <ShieldCheck className="mb-3 h-5 w-5 text-[#d19a15]" />
                    <h4 className="font-semibold text-[#4c4c4c]">Conversion Manager</h4>
                    <p className="mt-2 text-sm text-[#777]">Can update lead quality, booked consultation and conversion status for assigned practice.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
