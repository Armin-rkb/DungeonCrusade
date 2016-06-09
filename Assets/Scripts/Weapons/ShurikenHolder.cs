using UnityEngine;
using System.Collections;

public class ShurikenHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Shuriken shuriken;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public delegate void ShurikenEventHandler();
    public ShurikenEventHandler OnShurikenThrow;

    public void Shoot()
    {
        if (flip.facingRight)
        {

            if (OnShurikenThrow != null)
                OnShurikenThrow();

            Shuriken currShuriken = Instantiate(shuriken, new Vector2(transform.position.x + .5f, transform.position.y), shuriken.transform.rotation) as Shuriken;

            currShuriken.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currShuriken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currShuriken.GetComponent<Shuriken>().ShootRight();
        }
        else
        {

            if (OnShurikenThrow != null)
                OnShurikenThrow();

            Shuriken currShuriken = Instantiate(shuriken, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(shuriken.transform.rotation)) as Shuriken;

            currShuriken.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currShuriken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currShuriken.GetComponent<Shuriken>().ShootLeft();
        }
    }
}
