import { useState } from 'react';
import {
  PageHeader, Card, SectionHead, Notice, Button, DataTable,
  InputField, TextAreaField, SelectField,
} from '../components/index.js';
import * as mock from '../lib/mock.js';

const csvGuideCols = [
  { key: 'feed', header: 'Feed', className: 'cell-strong' },
  {
    key: 'columns',
    header: 'Required Columns',
    render: (row) => <code>{row.columns}</code>,
  },
];

export default function Imports() {
  // Upload CSV form state
  const [uploadBusiness, setUploadBusiness] = useState('');
  const [feedType, setFeedType] = useState('');
  const [csvFile, setCsvFile] = useState('');

  // Review automation task form state
  const [automationBusiness, setAutomationBusiness] = useState('');

  // Notes feed state
  const [feedOwner, setFeedOwner] = useState('');
  const [manualInputs, setManualInputs] = useState('');

  const handleUpload = (e) => {
    e.preventDefault();
    // Mock UI — no-op submit
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    // Mock UI — no-op submit
  };

  return (
    <div className="stack">
      {/* Section 1: Page header */}
      <PageHeader
        title="Import / Bulk"
        description="Upload CSV feeds, manage manual data rules, and automate review collection across all businesses."
        actions={
          <div className="row">
            <Button variant="secondary">Open Manual Conversion Entry</Button>
            <Button variant="secondary">Open Task Manager</Button>
          </div>
        }
      />

      {/* Sections 2 + 3: Upload form and Manual feed rules side by side */}
      <div className="grid cols-2">
        {/* Section 2: Upload CSV form */}
        <Card>
          <SectionHead
            title="Upload CSV"
            description="Select a business and feed type, then attach your CSV file."
          />
          <form className="stack" onSubmit={handleUpload}>
            <SelectField
              label="Business"
              options={mock.businesses}
              value={uploadBusiness}
              onChange={(e) => setUploadBusiness(e.target.value)}
            />
            <SelectField
              label="Feed Type"
              options={mock.feedTypes}
              value={feedType}
              onChange={(e) => setFeedType(e.target.value)}
            />
            <InputField
              label="CSV File"
              type="file"
              value={csvFile}
              onChange={(e) => setCsvFile(e.target.value)}
            />
            <div>
              <Button variant="primary" type="submit">Upload CSV Feed</Button>
            </div>
          </form>
        </Card>

        {/* Section 3: Manual feed rules */}
        <Card>
          <SectionHead
            title="Manual feed rules"
            description="How data flows automatically versus what requires a manual CSV upload."
          />
          <ul className="list">
            <li>
              <strong>Automatic:</strong> Meta Ads and Google Ads spend, clicks, and impressions sync daily at 07:30 via the scheduled job — no action needed.
            </li>
            <li>
              <strong>Automatic:</strong> AI reports and task generation run at 08:00 from the latest synced data and are emailed in the 08:05 digest.
            </li>
            <li>
              <strong>Manual CSV required:</strong> Conversions, Reviews, Bookings, and Organic channel data must be imported via CSV upload above.
            </li>
            <li>
              <strong>Manual entry:</strong> Individual conversions can also be added one-at-a-time using the Manual Conversion Entry form.
            </li>
          </ul>
          <Notice tone="warn">
            CSV totals are recomputed on every import. Re-uploading a feed for the same period will overwrite existing rows — check date ranges before uploading.
          </Notice>
        </Card>
      </div>

      {/* Section 4: Create review-automation task */}
      <Card>
        <SectionHead
          title="Review automation task"
          description="Create an automated review-collection task for a business. The task appears in the Task Manager queue."
        />
        <form className="stack" onSubmit={handleCreateTask}>
          <div className="grid cols-2">
            <SelectField
              label="Business"
              options={mock.businesses}
              value={automationBusiness}
              onChange={(e) => setAutomationBusiness(e.target.value)}
            />
          </div>
          <div>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Card>

      {/* Section 5: CSV column guide table */}
      <Card>
        <SectionHead
          title="CSV column guide"
          description="Expected column headers for each feed type. Columns must appear in the first row of the CSV."
        />
        <DataTable
          columns={csvGuideCols}
          rows={mock.csvGuide}
          rowKey="feed"
          empty="No guide entries found."
        />
      </Card>

      {/* Sections 6 + 7: Review request automation and Notes feed side by side */}
      <div className="grid cols-2">
        {/* Section 6: Review request automation */}
        <Card>
          <SectionHead
            title="Review request automation"
            description="Recommended live review-collection flow to maintain a strong rating across all practices."
          />
          <ul className="list">
            <li>
              After a completed appointment, trigger an automated SMS or email to the patient within 2 hours — this window yields the highest response rate.
            </li>
            <li>
              Link directly to the Google Business profile review page for the relevant practice; reduce friction by skipping intermediary landing pages.
            </li>
            <li>
              If no review is submitted within 48 hours, send a single polite follow-up — cap at one reminder to avoid complaint risk.
            </li>
            <li>
              Feed all incoming reviews into the CSV import nightly so sentiment and ratings remain current in AI reports and the Growth Hub.
            </li>
          </ul>
        </Card>

        {/* Section 7: Notes feed */}
        <Card>
          <SectionHead
            title="Notes feed"
            description="Record the owner of this feed and any manual inputs currently being tracked outside the automated pipeline."
          />
          <div className="stack">
            <InputField
              label="Feed Owner"
              type="text"
              value={feedOwner}
              onChange={(e) => setFeedOwner(e.target.value)}
            />
            <TextAreaField
              label="Current Manual Inputs"
              value={manualInputs}
              onChange={(e) => setManualInputs(e.target.value)}
            />
            <p className="subtle">
              Notes are stored locally for reference only and are not synced to the backend in this release.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
