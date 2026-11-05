import React from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { addToCart } from '../../features/cart/cartSlice';
import { toggleWishlist } from '../../features/ui/uiSlice';
import { addToast } from '../../features/toast/toastSlice';
import { openAuthModal, setPendingCartAction } from '../../features/auth/authSlice';
import { ShoppingBag, Star, Heart } from 'lucide-react';
import { SeedProduct } from '../../../server/data/initialData';
import { DEFAULT_ADD_TO_CART_QUANTITY } from '../../utils/ecommerceRules';
import { formatBDT } from '../../utils/currency';
import { useCartFly } from '../../context/CartFlyContext';
import { toggleWishlistOnServer } from '../../utils/wishlistApi';
import { handleImageFallback } from '../../utils/safeMarkdown';

interface ProductCardProps {
  product: SeedProduct;
  onViewProduct: (slug: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onViewProduct }) => {
  const dispatch = useAppDispatch();
  const { triggerCartFly } = useCartFly();
  const wishlist = useAppSelector((state) => state.ui.wishlistProductIds);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isWishlisted = wishlist.includes(product.id);

  const effectivePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const hasDiscount = product.salePrice && product.salePrice < product.price;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      dispatch(addToast({ type: 'warning', message: `"${product.name}" is currently out of stock.` }));
      return;
    }

    if (!isAuthenticated) {
      dispatch(
        setPendingCartAction({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          salePrice: product.salePrice,
          quantity: 1,
          image: product.images[0]?.url || '',
          stock: product.stock,
        })
      );
      dispatch(openAuthModal({ mode: 'register' }));
      dispatch(
        addToast({
          type: 'info',
          title: 'Account Required',
          message: 'Please create an account to add items to your cart.',
        })
      );
      return;
    }

    // Trigger visual flying animation toward navigation cart icon
    triggerCartFly(e.currentTarget as HTMLElement, product.images[0]?.url || '');

    dispatch(
      addToCart({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        quantity: 1,
        image: product.images[0]?.url || '',
        stock: product.stock,
      })
    );

    dispatch(
      addToast({
        type: 'success',
        title: 'Added to Cart',
        message: `"${product.name}" added to your cart.`,
      })
    );
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleWishlist(product.id));
    try {
      await toggleWishlistOnServer(product.id);
    } catch (err) {
      console.error('Failed to sync wishlist to server:', err);
    }
    dispatch(
      addToast({
        type: 'info',
        message: isWishlisted
          ? `Removed ${product.name} from your wishlist.`
          : `Saved ${product.name} to your wishlist.`,
      })
    );
  };

  return (
    <div
      onClick={() => onViewProduct(product.slug)}
      className="group relative min-w-0 overflow-hidden bg-white rounded-2xl border border-gray-100 hover:border-emerald-200/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-3 sm:p-4 flex flex-col h-full justify-between cursor-pointer"
    >
      {/* Top badges & Wishlist */}
      <div className="relative w-full aspect-square bg-[#f8faf9] rounded-xl overflow-hidden flex items-center justify-center p-2 mb-2.5 sm:mb-3 border border-gray-100/60">
        {product.badge && (
          <span
            className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md z-10 shadow-2xs ${
              product.badge.includes('%')
                ? 'bg-[#00875a] text-white'
                : product.badge === 'Hot'
                ? 'bg-amber-500 text-white'
                : 'bg-[#0c261e] text-emerald-300'
            }`}
          >
            {product.badge}
          </span>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-8 h-8 rounded-full flex items-center justify-center z-10 transition ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600 shadow-xs'
              : 'bg-white/90 text-gray-400 hover:text-rose-600 shadow-2xs hover:bg-white'
          }`}
          aria-label="Wishlist toggle"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Product photo with optimal fit and zero-distortion */}
        <img
          src={product.images[0]?.url}
          alt={product.images[0]?.alt || product.name}
          referrerPolicy="no-referrer"
          onError={handleImageFallback}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 select-none"
          loading="lazy"
        />
      </div>

      {/* Product metadata with stable 2-line title height */}
      <div className="min-w-0 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-emerald-800 transition line-clamp-2 min-h-[2.5rem] leading-snug">
            {product.name}
          </h3>

          {/* Rating and review count */}
          <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 mt-1.5">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                    i < Math.floor(product.ratingAverage)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-200 fill-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-gray-700">
              {product.ratingAverage.toFixed(1)}
            </span>
            <span className="text-[11px] text-gray-400">
              ({product.reviewCount > 1000 ? `${(product.reviewCount / 1000).toFixed(1)}k` : product.reviewCount})
            </span>
          </div>
        </div>

        {/* Price & Quick Add Button aligned at bottom */}
        <div className="flex items-center justify-between gap-1.5 mt-2.5 sm:mt-3 pt-2 border-t border-gray-100 min-w-0">
          <div className="tabular-nums min-w-0 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-sm sm:text-base font-extrabold text-gray-900">
              {formatBDT(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] sm:text-xs text-gray-400 line-through font-normal">
                {formatBDT(product.price)}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00875a] hover:bg-[#00724c] text-white flex items-center justify-center transition shadow-xs hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
