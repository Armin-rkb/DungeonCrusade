using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HadoukenHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Hadouken hadouken;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x + .1f, transform.position.y), hadouken.transform.rotation) as Hadouken;
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currHadouken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currHadouken.GetComponent<Hadouken>().ShootRight();
        }
        else
        {
            Hadouken currHadouken = Instantiate(hadouken, new Vector2(transform.position.x - .1f, transform.position.y), Quaternion.Euler(0,0,180)) as Hadouken;
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currHadouken.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currHadouken.GetComponent<Hadouken>().ShootLeft();
        }
    }
}
