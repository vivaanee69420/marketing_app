import { useState } from 'react';
import { PageHeader, Card, SectionHead, Button, DataTable, InputField, TextAreaField, SelectField } from '../components/index.js';
import { currency } from '../lib/format.js';
import * as mock from '../lib/mock.js';

const EMPTY_FORM = {
  business: mock.businesses[0] ?? '',
  conversionType: mock.conversionTypes[0] ?? '',
  name: '',
  email: '',
  phone: '',
  value: '',
  date: '',
  utmSource: '',
  utmCampaign: '',
  utmAdSet: '',
  notes: '',
};

const columns = [
  {
    header: 'Lead',
    render: (row) => (
      <div>
        <div className="cell-strong">{row.name}</div>
        <div className="subtle">{row.email} · {row.phone}</div>
      </div>
    ),
  },
  { header: 'Business', render: (row) => row.business },
  { header: 'Value', render: (row) => currency(row.value) },
  { header: 'Matched To', render: (row) => row.matchedTo },
  { header: 'Date', render: (row) => row.date },
];

export default function Conversions() {
  const [form, setForm] = useState(EMPTY_FORM);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Placeholder — wired to API in a later milestone.
  }

  return (
    <div className="stack">
      <PageHeader
        title="Website Leads"
        description="Log conversions and see how each is attributed."
        actions={<Button variant="primary">Upload CSV Feed</Button>}
      />

      <Card>
        <SectionHead title="Add conversion" />
        <form onSubmit={handleSubmit} className="stack">
          <div className="grid cols-2">
            <SelectField
              label="Business"
              options={mock.businesses}
              value={form.business}
              onChange={set('business')}
            />
            <SelectField
              label="Conversion Type"
              options={mock.conversionTypes}
              value={form.conversionType}
              onChange={set('conversionType')}
            />
            <InputField
              label="Name"
              value={form.name}
              onChange={set('name')}
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
            />
            <InputField
              label="Phone"
              value={form.phone}
              onChange={set('phone')}
            />
            <InputField
              label="Conversion Value"
              type="number"
              value={form.value}
              onChange={set('value')}
            />
            <InputField
              label="Conversion Date"
              type="datetime-local"
              value={form.date}
              onChange={set('date')}
            />
            <InputField
              label="UTM Source"
              value={form.utmSource}
              onChange={set('utmSource')}
            />
            <InputField
              label="UTM Campaign"
              value={form.utmCampaign}
              onChange={set('utmCampaign')}
            />
            <InputField
              label="UTM Ad Set"
              value={form.utmAdSet}
              onChange={set('utmAdSet')}
            />
          </div>
          <TextAreaField
            label="Source Notes"
            value={form.notes}
            onChange={set('notes')}
          />
          <div className="row">
            <Button variant="primary" type="submit">Save Conversion</Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHead title="Recent conversions" />
        <DataTable
          columns={columns}
          rows={mock.conversions}
          rowKey="id"
          empty="No conversions logged yet."
        />
      </Card>
    </div>
  );
}
