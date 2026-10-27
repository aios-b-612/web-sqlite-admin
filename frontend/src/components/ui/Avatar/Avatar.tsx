import { useState, useEffect, useRef } from 'react'
import useMergedRef from '../hooks/useMergeRef'
import classNames from 'classnames'
import { PiUserDuotone } from 'react-icons/pi'
import type { CommonProps, TypeAttributes } from '../@types/common'
import type { ReactNode, Ref } from 'react'

export interface AvatarProps extends CommonProps {
    alt?: string
    icon?: ReactNode
    onClick?: () => void
    ref?: Ref<HTMLSpanElement>
    size?: 'lg' | 'md' | 'sm' | number
    shape?: Exclude<TypeAttributes.Shape, 'none'> | 'square'
    src?: string
    srcSet?: string
}

const defaultProfileIcon = <PiUserDuotone />

const Avatar = (props: AvatarProps) => {
    const {
        alt,
        className,
        icon,
        ref = null,
        shape = 'circle',
        size = 'md',
        src,
        srcSet,
        ...rest
    } = props

    let { children } = props
    const originalChildren = children
    const [scale, setScale] = useState(1)
    const [imgFailed, setImgFailed] = useState(false)

    useEffect(() => {
        setImgFailed(false)
    }, [src])


    const avatarChildren = useRef<HTMLSpanElement>(null)
    const avatarNode = useRef<HTMLSpanElement>(null)

    const avatarMergeRef = useMergedRef(ref, avatarNode)

    const photoSrc = typeof src === 'string' ? src.trim() : ''
    const showPhoto = Boolean(photoSrc) && !imgFailed
    const resolvedIcon = icon ?? (originalChildren ? null : defaultProfileIcon)

    const innerScale = () => {
        if (!avatarChildren.current || !avatarNode.current) {
            return
        }
        const avatarChildrenWidth = avatarChildren.current.offsetWidth
        const avatarNodeWidth = avatarNode.current.offsetWidth
        if (avatarChildrenWidth === 0 || avatarNodeWidth === 0) {
            return
        }
        setScale(
            avatarNodeWidth - 8 < avatarChildrenWidth
                ? (avatarNodeWidth - 8) / avatarChildrenWidth
                : 1,
        )
    }

    useEffect(() => {
        innerScale()
    }, [scale, children])

    const sizeStyle =
        typeof size === 'number'
            ? {
                  width: size,
                  height: size,
                  minWidth: size,
                  lineHeight: `${size}px`,
                  fontSize: resolvedIcon ? size / 2 : 12,
              }
            : {}

    const classes = classNames(
        'avatar',
        `avatar-${shape}`,
        typeof size === 'string' ? `avatar-${size}` : '',
        className,
    )

    if (showPhoto) {
        children = (
            <img
                className={`avatar-img avatar-${shape}`}
                src={photoSrc}
                srcSet={srcSet}
                alt={alt}
                loading='lazy'
                onError={() => {
                    setImgFailed(true)
                }}
            />
        )
    } else if (resolvedIcon) {
        children = (
            <span className={classNames('avatar-icon', `avatar-icon-${size}`)}>
                {resolvedIcon}
            </span>
        )
    } else {
        const childrenSizeStyle =
            typeof size === 'number' ? { lineHeight: `${size}px` } : {}
        const stringCentralized = {
            transform: `translateX(-50%) scale(${scale})`,
        }
        children = (
            <span
                ref={avatarChildren}
                className={`avatar-string ${
                    typeof size === 'number' ? '' : `avatar-inner-${size}`
                }`}
                style={{
                    ...childrenSizeStyle,
                    ...stringCentralized,
                    ...(typeof size === 'number' ? { height: size } : {}),
                }}
            >
                {originalChildren}
            </span>
        )
    }

    return (
        <span
            ref={avatarMergeRef}
            className={classes}
            style={{ ...sizeStyle, ...rest.style }}
            role={!showPhoto && alt ? 'img' : undefined}
            aria-label={!showPhoto && alt ? alt : undefined}
            {...rest}
        >
            {children}
        </span>
    )
}

export default Avatar
