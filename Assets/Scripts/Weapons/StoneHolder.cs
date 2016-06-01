using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class StoneHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Stone stone;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Stone currStone = Instantiate(stone, new Vector2(transform.position.x + .1f, transform.position.y), stone.transform.rotation) as Stone;

            currStone.playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currStone.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currStone.GetComponent<Stone>().ShootRight();
        }
        else
        {
            Stone currStone = Instantiate(stone, new Vector2(transform.position.x - .1f, transform.position.y), Quaternion.Inverse(stone.transform.rotation)) as Stone;

            currStone.playernum = playernumber.PlayerNumber;
            
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currStone.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currStone.GetComponent<Stone>().ShootLeft();
        }
    }
}
