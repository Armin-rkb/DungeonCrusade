using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HadoukenHolder : MonoBehaviour, IWeapon
{

    public delegate void HadoukenEventHandler();
    public HadoukenEventHandler OnHadoukenShoot;


    [SerializeField] private Hadouken hadouken;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public void Shoot()
    {
        if (flip.facingRight)
        {

            if (OnHadoukenShoot != null)
                OnHadoukenShoot();

            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x + .1f, transform.position.y), hadouken.transform.rotation) as Hadouken;

            currHadouken.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currHadouken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currHadouken.GetComponent<Hadouken>().ShootRight();
        }
        else
        {
            if (OnHadoukenShoot != null)
                OnHadoukenShoot();

            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x - .1f, transform.position.y), Quaternion.Euler(0,0,180)) as Hadouken;

            currHadouken.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currHadouken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currHadouken.GetComponent<Hadouken>().ShootLeft();
        }
    }
}
