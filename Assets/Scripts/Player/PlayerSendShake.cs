using UnityEngine;
using System.Collections;

public class PlayerSendShake: MonoBehaviour
{

    public delegate void ProjectileShakeHandler(PlayerSendShake player);

    public static event ProjectileShakeHandler OnStoneShake;
    public static event ProjectileShakeHandler OnPillShake;
    public static event ProjectileShakeHandler OnShurikenShake;
    public static event ProjectileShakeHandler OnHadoukenShake;
    public static event ProjectileShakeHandler OnPizzaShake;
    public static event ProjectileShakeHandler OnBarrelShake;
    public static event ProjectileShakeHandler OnSockShake;
    public static event ProjectileShakeHandler OnDuckShake;
    public static event ProjectileShakeHandler OnBombShake;


    void OnCollisionEnter2D(Collision2D projectile)
    {
        if (projectile.gameObject.CompareTag(GameTags.bullet))
        {
            if (projectile.gameObject.GetComponent<Stone>() != null)
            {
                if (OnStoneShake != null)
                    OnStoneShake(this);
            }

            else if (projectile.gameObject.GetComponent<Pill>() != null)
            {
                if (OnPillShake != null)
                    OnPillShake(this);
            }

            else if (projectile.gameObject.GetComponent<Shuriken>() != null)
            {
                if (OnShurikenShake != null)
                    OnShurikenShake(this);
            }


            else if (projectile.gameObject.GetComponent<Hadouken>() != null)
            {
                if (OnHadoukenShake != null)
                    OnHadoukenShake(this);
            }

            else if (projectile.gameObject.GetComponent<Pizza>() != null)
            {
                if (OnPizzaShake != null)
                    OnPizzaShake(this);
            }

            else if (projectile.gameObject.GetComponent<Barrel>() != null)
            {
                if (OnBarrelShake != null)
                    OnBarrelShake(this);
            }

            else if (projectile.gameObject.GetComponent<SockExplosion>() != null)
            {
                if (OnSockShake != null)
                    OnSockShake(this);
            }

            else if (projectile.gameObject.GetComponent<DuckExplosion>() != null)
            {
                if (OnDuckShake != null)
                    OnDuckShake(this);
            }

            else if (projectile.gameObject.GetComponent<Bomb>() != null)
            {
                if (OnBombShake != null)
                    OnBombShake(this);
            }

        }
    }
}
