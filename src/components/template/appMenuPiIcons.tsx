import type { ReactNode } from 'react'
import {
  TbAppWindow,
  TbBell,
  TbBriefcase,
  TbBuilding,
  TbCalculator,
  TbCalendar,
  TbCash,
  TbClipboardList,
  TbCode,
  TbDatabaseExport,
  TbDatabaseImport,
  TbDeviceMobile,
  TbDeviceTv,
  TbFilePencil,
  TbFileText,
  TbFlask,
  TbHelpCircle,
  TbLink,
  TbMail,
  TbMessage,
  TbMicrophone,
  TbMoodSmile,
  TbPackage,
  TbPhone,
  TbSearch,
  TbShoppingCart,
  TbTicket,
  TbUserCircle,
  TbUsers,
  TbWorldWww,
} from 'react-icons/tb'

/**
 * Ícones do AppMenu — chaves canônicas do web-auth (`app_menu_registry.json`).
 *
 * O registry manda `tb:<kebab>` (Tabler). Chaves `pi:*` ficam como alias legado.
 * Sem o mapa `tb:*`, todo app cai no fallback e o menu fica com ícones iguais.
 */
const MAP: Record<string, ReactNode> = {
  'tb:bell': <TbBell />,
  'tb:briefcase': <TbBriefcase />,
  'tb:building': <TbBuilding />,
  'tb:calculator': <TbCalculator />,
  'tb:calendar': <TbCalendar />,
  'tb:cash': <TbCash />,
  'tb:clipboard-list': <TbClipboardList />,
  'tb:code': <TbCode />,
  'tb:database-export': <TbDatabaseExport />,
  'tb:database-import': <TbDatabaseImport />,
  'tb:device-mobile': <TbDeviceMobile />,
  'tb:device-tv': <TbDeviceTv />,
  'tb:file-pencil': <TbFilePencil />,
  'tb:file-text': <TbFileText />,
  'tb:flask': <TbFlask />,
  'tb:help-circle': <TbHelpCircle />,
  'tb:link': <TbLink />,
  'tb:mail': <TbMail />,
  'tb:message': <TbMessage />,
  'tb:microphone': <TbMicrophone />,
  'tb:mood-smile': <TbMoodSmile />,
  'tb:package': <TbPackage />,
  'tb:phone': <TbPhone />,
  'tb:search': <TbSearch />,
  'tb:shopping-cart': <TbShoppingCart />,
  'tb:ticket': <TbTicket />,
  'tb:user-circle': <TbUserCircle />,
  'tb:users': <TbUsers />,
  'tb:world-www': <TbWorldWww />,

  'pi:bell-duotone': <TbBell />,
  'pi:briefcase-duotone': <TbBriefcase />,
  'pi:buildings-duotone': <TbBuilding />,
  'pi:calculator-duotone': <TbCalculator />,
  'pi:calendar-duotone': <TbCalendar />,
  'pi:cash-register-duotone': <TbCash />,
  'pi:chat-circle-duotone': <TbMessage />,
  'pi:chat-teardrop-text-duotone': <TbMessage />,
  'pi:device-mobile-duotone': <TbDeviceMobile />,
  'pi:envelope-duotone': <TbMail />,
  'pi:file-text-duotone': <TbFileText />,
  'pi:kanban-duotone': <TbPhone />,
  'pi:magnifying-glass-duotone': <TbSearch />,
  'pi:megaphone-duotone': <TbMessage />,
  'pi:monitor-play-duotone': <TbDeviceTv />,
  'pi:package-duotone': <TbPackage />,
  'pi:phone-duotone': <TbMicrophone />,
  'pi:question-duotone': <TbHelpCircle />,
  'pi:smiley-duotone': <TbMoodSmile />,
  'pi:user-circle-duotone': <TbUserCircle />,
  'pi:users-duotone': <TbUserCircle />,
}

export function isKnownAppMenuIcon(iconKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(MAP, iconKey)
}

export function renderAppMenuPiIcon(iconKey: string): ReactNode {
  return MAP[iconKey] ?? <TbAppWindow />
}
