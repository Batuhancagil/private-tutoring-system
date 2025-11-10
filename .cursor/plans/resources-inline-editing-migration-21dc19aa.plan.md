<!-- 21dc19aa-b18e-42fc-92f9-18596e48f06d 58efdc08-efac-4b23-b185-cb4dabc45162 -->
# Resources Page Inline Editing Migration

## Overview
Convert the resources page from form-based editing to inline editing matching the lessons page pattern. Ensure API compatibility and consistent user experience.

## Key Changes Required

### 1. UI Pattern Migration
- Replace form-based editing with inline table editing
- Add inline input fields for name and description in table rows
- Add "Düzenle" (Edit), "İptal" (Cancel), "Kaydet" (Save) buttons inline
- Add new resource creation row at top of table (like lessons page)
- Remove separate form section at bottom

### 2. State Management Refactoring
- Replace `editingResource` state with `editingResourceId` (matches `editingLessonId`)
- Add `resourceDrafts` state (Record<string, ResourceDraft>) matching `lessonDrafts` pattern
- Add `updatingResourceIds` and `deletingResourceIds` for loading states
- Add `creatingResource` state for new resource creation
- Add `newResourceDraft` state for new resource form

### 3. API Client Migration
- Replace direct `fetch` calls with `resourcesApi` client (from `@/lib/api/resources.ts`)
- Update response handling to use `SuccessResponse` wrapper pattern
- Handle API errors using `ApiError` class (matches lessons page)

### 4. API Compatibility Check
**Current API Structure:**
- GET `/api/resources` - Returns `SuccessResponse<ResourceResponse[]>` with pagination
- POST `/api/resources` - Creates resource, expects `{ name, description, lessonIds, topicIds, topicQuestionCounts }`
- PUT `/api/resources/[id]` - Updates resource, same body structure
- DELETE `/api/resources/[id]` - Deletes resource

**Compatibility Status:**
- ✅ API endpoints follow same pattern as lessons
- ✅ Both use `SuccessResponse` wrapper
- ✅ Both support CRUD operations
- ⚠️ Resources API response structure differs (nested lessons/topics vs flat structure)
- ⚠️ Resources page currently uses direct fetch, needs migration to `resourcesApi`

### 5. Data Structure Alignment
- Resources have nested structure: `Resource -> ResourceLesson[] -> ResourceTopic[]`
- Lessons have flat structure: `Lesson -> LessonTopic[]`
- Need to handle nested data transformation in UI
- Keep lesson/topic selection UI (can remain in expanded row or modal)

### 6. Workflow Consistency
**Lessons Page Workflow:**
1. Click "Düzenle" → Row enters edit mode
2. Edit fields inline → Changes stored in draft
3. Click "Kaydet" → API call, optimistic update
4. Click "İptal" → Discard draft, exit edit mode

**Resources Page Target Workflow:**
1. Click "Düzenle" → Row enters edit mode (name, description inline)
2. Edit name/description inline → Changes stored in draft
3. For lesson/topic selection → Keep in expanded section or modal
4. Click "Kaydet" → API call with full data, optimistic update
5. Click "İptal" → Discard draft, exit edit mode

## Implementation Steps

### Step 1: Update State Management
- Add draft state management matching lessons pattern
- Add loading states for create/update/delete operations
- Remove `editingResource` object state

### Step 2: Migrate to API Client
- Replace `fetch('/api/resources')` with `resourcesApi.getAll()`
- Replace `fetch('/api/resources', { method: 'POST' })` with `resourcesApi.create()`
- Replace `fetch('/api/resources/[id]', { method: 'PUT' })` with `resourcesApi.update()`
- Replace `fetch('/api/resources/[id]', { method: 'DELETE' })` with `resourcesApi.delete()`
- Handle `SuccessResponse` wrapper and extract `data` property

### Step 3: Implement Inline Editing UI
- Convert table rows to support inline editing
- Add input fields that appear when `editingResourceId === resource.id`
- Add "Düzenle", "İptal", "Kaydet" buttons matching lessons page styling
- Add new resource creation row at top as a SINGLE LINE (no expansion)
- Remove expand button from new resource row
- Make lesson/topic selection optional during creation (can be added later via edit)
- Match lessons page structure exactly - single `<tr>` with all fields inline

### Step 4: Handle Complex Fields
- Keep lesson/topic selection in expanded section (or modal)
- Update selection state when editing resource
- Ensure lesson/topic selection updates draft state

### Step 5: Optimistic Updates
- Update local state immediately on save
- Revert on error (matching lessons page pattern)
- Show loading states during operations

### Step 6: Error Handling
- Use `ApiError` class for error handling
- Show user-friendly error messages
- Match error handling pattern from lessons page

## Files to Modify

1. `src/app/dashboard/resources/page.tsx` - Complete refactor
2. May need to check `src/lib/api/resources.ts` - Ensure proper types
3. May need to check `src/types/api.ts` - Verify ResourceResponse type

## Notes
- Resources have more complex data (lessons/topics selection) than lessons
- Consider keeping lesson/topic selection UI separate from inline editing
- Maintain existing functionality while improving UX consistency

### To-dos

- [ ] Refactor state management: Replace editingResource with editingResourceId, add resourceDrafts, updatingResourceIds, deletingResourceIds, creatingResource, newResourceDraft
- [ ] Migrate API calls: Replace fetch calls with resourcesApi client, handle SuccessResponse wrapper, use ApiError for error handling
- [ ] Implement inline editing UI: Add inline input fields for name/description, add Edit/Cancel/Save buttons matching lessons page style
- [ ] Add new resource creation row: Add top row with inline inputs for creating new resources, matching lessons page pattern
- [ ] Handle lesson/topic selection: Keep selection UI in expanded section, update draft state when selections change
- [ ] Implement optimistic updates: Update local state immediately, revert on error, show loading states