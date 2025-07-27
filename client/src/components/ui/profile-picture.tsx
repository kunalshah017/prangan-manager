import React from 'react';
import { cn } from '@/lib/utils';

interface ProfilePictureProps {
  /** Profile image URL */
  imageUrl?: string;
  /** Name to generate initials from */
  name?: string;
  /** Size classes for the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
  /** Custom className for additional styling */
  className?: string;
  /** Alt text for the image */
  alt?: string;
  /** Background color theme */
  colorScheme?: 'orange' | 'blue' | 'green' | 'purple' | 'gray';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

const colorSchemes = {
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-700',
};

/**
 * ProfilePicture component that displays a profile image or initials fallback
 * 
 * @param imageUrl - URL of the profile image
 * @param name - Name to generate initials from
 * @param size - Size of the avatar (sm, md, lg, xl, or custom classes)
 * @param className - Additional CSS classes
 * @param alt - Alt text for the image
 * @param colorScheme - Color theme for the initials fallback
 */
export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUrl,
  name = '',
  size = 'md',
  className,
  alt,
  colorScheme = 'orange',
}) => {
  // Generate initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName) return 'U';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    // Take first letter of first name and first letter of last name
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get size classes - either predefined or custom
  const getSizeClasses = (): string => {
    if (Object.keys(sizeClasses).includes(size)) {
      return sizeClasses[size as keyof typeof sizeClasses];
    }
    return size; // Return custom size classes as-is
  };

  const initials = getInitials(name);
  const sizeClass = getSizeClasses();
  const colorClass = colorSchemes[colorScheme];

  // If image URL is provided and valid, show image
  if (imageUrl && imageUrl.trim()) {
    return (
      <div className={cn(
        'relative flex-shrink-0 overflow-hidden rounded-full',
        sizeClass,
        className
      )}>
        <img
          src={imageUrl}
          alt={alt || `${name}'s profile picture`}
          className="h-full w-full object-cover"
          onError={(e) => {
            // On image load error, hide the image and show initials fallback
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />
        {/* Hidden fallback that shows when image fails */}
        <div 
          className={cn(
            'absolute inset-0 hidden items-center justify-center rounded-full font-medium',
            sizeClass,
            colorClass
          )}
          style={{ display: 'none' }}
        >
          {initials}
        </div>
      </div>
    );
  }

  // Show initials fallback
  return (
    <div className={cn(
      'flex flex-shrink-0 items-center justify-center rounded-full font-medium',
      sizeClass,
      colorClass,
      className
    )}>
      {initials}
    </div>
  );
}; 