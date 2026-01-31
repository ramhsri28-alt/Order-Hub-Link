import { CustomerLayout } from "@/components/layout-customer";
import { useMenu } from "@/hooks/use-menu";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Phone, Clock, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { GoogleMap } from "@/components/google-map";

export default function CustomerHome() {
  const { data: menu, isLoading, error } = useMenu();
  const addItem = useCart((state) => state.addItem);

  // Group menu by category
  const categories = menu ? Array.from(new Set(menu.map(item => item.category))) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        Error loading menu. Please try again later.
      </div>
    );
  }

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        {/* Unsplash image: Gourmet dark food photography background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1514362545857-3bc16549766b?q=80&w=1920&auto=format&fit=crop)` }}
        />
        
        <div className="relative z-20 container mx-auto px-4 text-center text-white space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-bold leading-tight"
          >
            Taste the <span className="text-primary">Extraordinary</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl font-light text-white/90 max-w-2xl mx-auto"
          >
            Experience culinary excellence delivered straight to your table.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 border-none"
              onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Menu
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">Our Menu</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Carefully curated dishes prepared with fresh, locally sourced ingredients.
            </p>
          </div>

          <div className="space-y-20">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-2xl font-display font-bold mb-8 capitalize flex items-center gap-4">
                  {category}
                  <div className="h-px flex-1 bg-border" />
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {menu?.filter(item => item.category === category).map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="group h-full overflow-hidden border-border/50 hover:border-primary/50 transition-colors duration-300 bg-card hover:shadow-xl hover:shadow-black/5">
                        <div className="aspect-[4/3] overflow-hidden relative">
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                          {!item.available && (
                            <div className="absolute inset-0 z-20 bg-background/80 flex items-center justify-center">
                              <Badge variant="destructive" className="text-lg py-2 px-4">Sold Out</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-display font-bold text-xl text-foreground">{item.name}</h4>
                            <span className="font-mono font-semibold text-primary text-lg">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-2">
                            {item.description}
                          </p>
                          <Button 
                            className="w-full gap-2 font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200"
                            disabled={!item.available}
                            onClick={() => addItem(item)}
                          >
                            <Plus className="w-4 h-4" /> Add to Order
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Location Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">Visit Us</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Find us at our location or give us a call to reserve your table.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <GoogleMap 
              lat={27.7172} 
              lng={85.3240} 
              address="BistroSync Restaurant, Kathmandu, Nepal" 
            />
            
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Call Us</h3>
                    <p className="text-muted-foreground mb-2">For reservations and takeout orders</p>
                    <a 
                      href="tel:+9779805190408" 
                      className="text-primary font-mono text-lg hover:underline"
                      data-testid="link-phone"
                    >
                      +977 9805190408
                    </a>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Opening Hours</h3>
                    <div className="text-muted-foreground space-y-1">
                      <p>Monday - Friday: 10:00 AM - 10:00 PM</p>
                      <p>Saturday - Sunday: 9:00 AM - 11:00 PM</p>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Address</h3>
                    <p className="text-muted-foreground">
                      BistroSync Restaurant<br />
                      Kathmandu, Nepal
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
