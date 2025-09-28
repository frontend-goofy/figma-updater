import { logger } from './logger.js';
import { getFigmaVersionsList } from './modules/api.js';
import getTextDiffsMapping from './modules/diffs-mapping.js';

export default async function getFigmaDiffs(
  figmaUrl: string,
  oldVersion: string | undefined,
  newVersion: string | undefined,
) {
  if (!oldVersion || !newVersion) {
    const versions = await getFigmaVersionsList(figmaUrl);

    if (versions === null) {
      logger.error('No versions found');

      return undefined;
    }

    logger.success('Versions:\n');
    versions.forEach((version) => {
      logger.success(version.id + ' ' + (version.label ?? ''));
      logger.success(
        new Date(version.created_at).toLocaleDateString('ru-Ru'),
        version.user.handle,
        '\n',
      );
    });

    return undefined;
  }

  const mapping = await getTextDiffsMapping(figmaUrl, oldVersion, newVersion);

  return mapping;
}
