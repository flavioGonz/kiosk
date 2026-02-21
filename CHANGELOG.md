# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Payroll Management**: Structural modules to handle initial state of employee payroll.
- **Advanced Shift & Task Codes**: Native assignment capability mapping dynamic task codes and different shift typologies (Fixed, Rotating, Open) to employees directly.
- **Sector Administration Enhancements**: Smart removal warning dialogs routing orphaned employees to target sectors securely and rename mechanism with real-time feedback.
- **Robust Local Download Management in Devices view**: Allowed fetching local synced database registers (employees + logs) independent from live internet state as backups.
- **Real-Time Timestamps sync**: Displayed detailed clock disparity reporting differences among Local Interface Time vs Target Terminal sync interval in device list panel.
- **Device Independent Enrollment interface**: Added standard web portal support enabling Remote device agnostic Employee photo capture and credential submission anywhere on the network bypassing offline dedicated terminal bounds.

### Fixed
- Menu Grouping Layout displaying categories structured within specific conceptual blocks like 'Empresa' and 'Seguridad'.
- Unused Lucide icon import errors blocking the production `tsc` build process (Removed `Search, Clock, useState, Edit2, motion`, etc. correctly tracked missing references).

### Changed
- Refactored `UserFormModal` fields to implement dynamic mapped selectors sourcing from existing databases instead of plain free-text input fields for 'Sector' and 'Shift'.
