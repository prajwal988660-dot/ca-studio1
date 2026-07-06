/**
 * Entity Data Initialization Dispatcher
 *
 * Routes to entity-specific initializers based on company.entity_type.
 * Called once after company creation to bootstrap all entity-specific
 * modules (classification, compliance, IFC, registers, etc.)
 */

import type { Company } from '@/types/company';
import { initPrivateLimited } from '@/entities/private-limited/init';

/**
 * Initialize entity-specific data for a newly created company.
 * Safe to call for any entity type — only acts when an initializer exists.
 */
export function initEntityData(company: Company): void {
  switch (company.entity_type) {
    case 'pvt_ltd':
      initPrivateLimited(company);
      break;
    // Future: other entity types
    // case 'public_ltd': break;
    // case 'llp': break;
    default:
      break;
  }
}
