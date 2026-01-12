# Research Page Data Flow

## Overview
This document tracks all data sources and state variables used in `/src/app/dashboard/research/page.js`.

---

## State Variables

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `donors` | Array | API/localStorage | Main donor list from AI search |
| `loading` | Boolean | Local | Loading state during API calls |
| `hasSearched` | Boolean | Local | Whether user has performed a search |
| `expandedId` | String | Local | Currently expanded donor card ID |
| `pipelineIds` | Set | localStorage | Donors added to pipeline |
| `rejectedIds` | Set | localStorage | Donors marked as not qualified |
| `searchQuery` | String | User input | Text filter for donor list |
| `campaignName` | String | Modal | Name of current campaign |
| `currentCampaign` | Object | localStorage | Active campaign object |
| `regionFilter` | String | User input | Geographic filter (unused) |
| `statusFilter` | String | User input | Status filter: all/qualified/high-priority/not-qualified |
| `categoryFilter` | String | User input | Category filter: all/foundation/government |
| `isModalOpen` | Boolean | Local | Search config modal visibility |
| `searchConfig` | Object | Modal | Search configuration from modal |
| `availableCampaigns` | Array | localStorage | List of saved campaigns |

---

## Data Flow

### 1. Initial Load
```
Page Mount
    ↓
useEffect: Load campaigns from localStorage
    ↓
If activeCampaign exists:
    → Load cached donors from localStorage
    → Or fetch from API if not cached
```

### 2. New Search Flow
```
User clicks "Find Funding Matches"
    ↓
SearchConfigModal opens
    ↓
User fills: Campaign Name, Mission, Strategic Goals, Focus Areas, ZIP Code
    ↓
User clicks "Search" button
    ↓
handleSearchConfig(config) called
    ↓
POST /api/ai/donor-search/start
    ↓
Returns { jobId: "uuid" }
    ↓
Poll /api/ai/donor-search/status?jobId=xxx every 3 seconds
    ↓
When status === 'complete':
    → setDonors(result.donors)
    → saveAIDonorResults() to Supabase
    → cacheDonorsForCampaign() to localStorage
```

### 3. Filter Flow
```
donors (state)
    ↓
filteredDonors = donors.filter():
    1. searchQuery filter (text match on name/focus_areas/description)
    2. categoryFilter (all/foundation/government)
    3. statusFilter (all/qualified/high-priority/not-qualified)
    ↓
sortedDonors = filteredDonors.sort():
    1. Rejected donors → last
    2. Pipeline donors → after active
    3. By alignment_score → descending
    ↓
UI renders sortedDonors.map(donor => <DonorCard />)
```

---

## API Endpoints

### `/api/ai/donor-search/start` (POST)
**Request:**
```json
{
  "organizationName": "Girls Who Code",
  "mission": "We help girls learn how to code",
  "zipCode": "30126",
  "focusAreas": "STEM education, technology",
  "donorCount": 50
}
```
**Response:**
```json
{
  "success": true,
  "jobId": "a5142cff-e3ce-48f9-bfa1-7b12de87b637"
}
```

### `/api/ai/donor-search/status` (GET)
**Request:** `?jobId=a5142cff-e3ce-48f9-bfa1-7b12de87b637`

**Response (processing):**
```json
{
  "success": true,
  "status": "processing",
  "progress": 30,
  "stage": "Searching 990-PF filings..."
}
```

**Response (complete):**
```json
{
  "success": true,
  "status": "complete",
  "progress": 100,
  "stage": "Search complete!",
  "donors": [...],
  "count": 50
}
```

---

## localStorage Keys

| Key | Description |
|-----|-------------|
| `campaigns` | Array of campaign objects |
| `activeCampaignId` | Current active campaign ID |
| `donorCache_{campaignId}` | Cached donors for a campaign |
| `organizationId` | User's organization ID |
| `orgSettings` | Organization settings (name, mission, etc.) |
| `dailySearchCount` | Number of searches today |
| `dailySearchDate` | Date of last search count reset |

---

## Debug Logging

The following logs help troubleshoot data flow:

```
🔍 [Filter Debug] donors state length: X
🔍 [Filter Debug] categoryFilter: all|foundation|government
🔍 [Filter Debug] statusFilter: all|qualified|high-priority|not-qualified
🔍 [Filter Debug] searchQuery: (text or empty)
🔍 [Filter Debug] First donor: Name | category: X | source: X
🔍 [Filter Debug] filteredDonors length: X
```

---

## Common Issues

### Issue: "0 Organizations" but donors were returned
**Check:**
1. `donors` state length in console
2. `categoryFilter` value - might be filtering all out
3. `statusFilter` value - "qualified" shows only pipeline items
4. React re-render timing - state might not have updated yet

### Issue: Donors not persisting
**Check:**
1. Campaign ID format - must be valid UUID for Supabase
2. localStorage cache key format
3. Supabase insert errors in console

### Issue: Filter counts wrong
**Check:**
1. Category matching logic (case-sensitive)
2. Source field matching for grants.gov
